from django.db import models
from django.db.models import F, Sum, Count, Case, When, Avg, Q
from django.db.models.functions import TruncMonth, TruncQuarter, TruncYear
from django.utils.timezone import now
from datetime import timedelta, datetime, date
from django.contrib.contenttypes.models import ContentType
import logging
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.generics import ListAPIView, ListCreateAPIView
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class IsAdminUser(BasePermission):
    """Allow access to admin group members and superusers."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser
            or request.user.groups.filter(name="admin").exists()
        )
    
class BaseGroupPermission(BasePermission):
    """Base permission checking membership in a specific group or admin."""

    group_name: str = ""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser
            or request.user.groups.filter(name__in=["admin", self.group_name]).exists()
        )


class IsVentasUser(BaseGroupPermission):
    group_name = "ventas"


class IsProduccionUser(BaseGroupPermission):
    group_name = "produccion"


class IsFinanzasUser(BaseGroupPermission):
    group_name = "finanzas"

from .models import (
    Producto,
    Venta,
    DetallesVenta,
    MovimientoInventario,
    Compra,
    Categoria,
    Cliente,
    Transaccion,
    DevolucionProducto,
    HistorialPrecio,
    RegistroTurno,
    LoteMateriaPrima,
    LoteProductoFinal,
    UnidadMedida,
    AuditLog,
)
from .serializers import (
    CriticalProductSerializer,
    ProductoSerializer,
    VentaSerializer,
    VentaCreateSerializer,
    CategoriaSerializer,
    ClienteSerializer,
    ClienteCreateSerializer,
    EmployeeSerializer,
    TransaccionSerializer,
    DevolucionSerializer,
    RegistroTurnoSerializer,
    UnidadMedidaSerializer,
    AuditLogSerializer,
)
from .utils import (
    calcular_perdidas_devolucion,
    detectar_faltantes,
    auto_reordenar,
)
from .analytics import (
    _parse_date,
    rotation_report,
    association_rules,
    purchase_recommendations,
)
from .planning import generar_plan


class CriticalProductPagination(PageNumberPagination):
    page_size = 20


class CriticalProductListView(ListAPIView):
    queryset = Producto.objects.all()
    serializer_class = CriticalProductSerializer
    pagination_class = CriticalProductPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Producto.objects.filter(stock_actual__lte=F("stock_minimo")).order_by(
            "nombre"
        )

class ProductoPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 1000


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all().order_by("nombre")
    serializer_class = ProductoSerializer
    pagination_class = ProductoPagination


    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset().select_related("categoria", "proveedor").prefetch_related(
            "ingredientes__ingrediente"
        )
        search = self.request.query_params.get("search")
        codigo = self.request.query_params.get("codigo")
        if codigo:
            qs = qs.filter(codigo__iexact=codigo)
        if search:
            qs = qs.filter(nombre__icontains=search)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if "categoria" in data:
            try:
                data["categoria"] = int(data["categoria"])
            except (TypeError, ValueError):
                return Response(
                    {"categoria": ["Invalid id"]}, status=status.HTTP_400_BAD_REQUEST
                )
        if "ingredientes" in data and isinstance(data["ingredientes"], list):
            for comp in data["ingredientes"]:
                try:
                    comp["ingrediente"] = int(comp["ingrediente"])
                except (TypeError, ValueError, KeyError):
                    return Response(
                        {"ingredientes": ["Invalid ingrediente id"]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            logging.error("Product validation failed: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def partial_update(self, request, *args, **kwargs):
        data = request.data.copy()
        if "ingredientes" in data and isinstance(data["ingredientes"], list):
            for comp in data["ingredientes"]:
                try:
                    comp["ingrediente"] = int(comp["ingrediente"])
                except (TypeError, ValueError, KeyError):
                    return Response({"ingredientes": ["Invalid ingrediente id"]}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a product and register the removal in inventory."""
        instance = self.get_object()
        stock = instance.stock_actual
        if stock > 0:
            MovimientoInventario.objects.create(
                producto=instance,
                tipo="salida",
                cantidad=stock,
                motivo="Eliminación de producto",
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoriaListView(ListAPIView):
    """API pública para listar categorías de productos."""

    queryset = Categoria.objects.all().order_by("nombre_categoria")
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]

class UnidadMedidaListView(ListAPIView):
    """Lista de unidades de medida disponibles."""

    queryset = UnidadMedida.objects.all().order_by("nombre")
    serializer_class = UnidadMedidaSerializer
    permission_classes = [IsAuthenticated]

class ClienteListView(ListCreateAPIView):
    """API para listar y crear clientes."""

    queryset = Cliente.objects.all().order_by("nombre")
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClienteCreateSerializer
        return ClienteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(Q(nombre__icontains=q) | Q(contacto__icontains=q))
        return qs

    def create(self, request, *args, **kwargs):
        """Handle client creation with explicit validation and error handling."""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            self.perform_create(serializer)
        except Exception:  # pragma: no cover - unexpected database error
            logging.exception("Client creation failed")
            return Response(
                {"detail": "Error al registrar el cliente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
class VentaPagination(PageNumberPagination):
    page_size = 20


class VentaListCreateView(ListCreateAPIView):
    queryset = Venta.objects.all().order_by("-fecha")
    serializer_class = VentaSerializer
    pagination_class = VentaPagination


    permission_classes = [IsVentasUser]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return VentaCreateSerializer
        return VentaSerializer
    
    def get_queryset(self):
        qs = (
            super()
            .get_queryset()
            .select_related("cliente", "usuario")
        )
        fecha = self.request.query_params.get("fecha")
        usuario = self.request.query_params.get("usuario")
        if fecha:
            qs = qs.filter(fecha=fecha)
        if usuario:
            qs = qs.filter(usuario_id=usuario)
        return qs


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = now().date()
        week_start = today - timedelta(days=6)

        sales_today = Venta.objects.filter(fecha=today).aggregate(total=Sum('total'))['total'] or 0
        sales_week = Venta.objects.filter(fecha__range=[week_start, today]).aggregate(total=Sum('total'))['total'] or 0

        total_products = Producto.objects.count()
        low_stock = Producto.objects.filter(stock_actual__lte=F('stock_minimo')).count()
        out_stock = Producto.objects.filter(stock_actual__lte=0).count()
        inventory_value = Producto.objects.aggregate(total=Sum(F('stock_actual') * F('precio')))['total'] or 0

        production_today = MovimientoInventario.objects.filter(
            tipo='entrada', fecha__date=today
        ).exclude(motivo='Compra').aggregate(total=Sum('cantidad'))['total'] or 0

        month_start = today.replace(day=1)
        fixed_costs = (
            Transaccion.objects.filter(
                tipo='egreso',
                fecha__range=[month_start, today],
                tipo_costo='fijo'
            ).aggregate(total=Sum('monto'))['total'] or 0
        )
        variable_costs = (
            Transaccion.objects.filter(
                tipo='egreso',
                fecha__range=[month_start, today],
                tipo_costo='variable'
            ).aggregate(total=Sum('monto'))['total'] or 0
        )
        operational_costs = (
            Transaccion.objects.filter(
                tipo='egreso',
                fecha__range=[month_start, today],
                operativo=True,
            ).aggregate(total=Sum('monto'))['total'] or 0
        )
        non_operational_costs = (
            Transaccion.objects.filter(
                tipo='egreso',
                fecha__range=[month_start, today],
                operativo=False,
            ).aggregate(total=Sum('monto'))['total'] or 0
        )
        total_egresos = float(operational_costs + non_operational_costs)
        non_operational_percent = (
            (float(non_operational_costs) / total_egresos * 100)
            if total_egresos
            else 0.0
        )
        ventas_mes = (
            Venta.objects.filter(fecha__range=[month_start, today]).aggregate(
                total=Sum("total")
            )["total"]
            or 0
        )
        ventas_mes = (
            Venta.objects.filter(fecha__range=[month_start, today])
            .aggregate(total=Sum("total"))["total"]
            or 0
        )
        break_even = None
        if ventas_mes:
            cm_ratio = 1 - (float(variable_costs) / float(ventas_mes))
            if cm_ratio > 0:
                break_even = float(fixed_costs) / float(cm_ratio)
        top_products_qs = (
            DetallesVenta.objects.filter(venta__fecha__range=[month_start, today])
            .values('producto__nombre')
            .annotate(total_vendido=Sum('cantidad'))
            .order_by('-total_vendido')[:5]
        )
        top_products = list(top_products_qs)

        ventas_semana = (
            Venta.objects.filter(fecha__range=[week_start, today])
            .values('fecha')
            .annotate(total=Sum('total'))
        )
        sales_by_day = {v['fecha']: float(v['total']) for v in ventas_semana}
        week_sales = []
        for i in range(7):
            day = week_start + timedelta(days=i)
            week_sales.append({'day': day.strftime('%a'), 'total': sales_by_day.get(day, 0.0)})

        alerts = list(
            Producto.objects.filter(stock_actual__lte=F('stock_minimo'))
            .values('nombre', 'stock_actual', 'stock_minimo')[:5]
        )

        return Response({
            'sales_today': sales_today,
            'sales_week': sales_week,
            'total_products': total_products,
            'low_stock': low_stock,
            'out_stock': out_stock,
            'inventory_value': inventory_value,
            'production_today': production_today,
            'fixed_costs': fixed_costs,
            'variable_costs': variable_costs,
            'operational_costs': float(operational_costs),
            'non_operational_costs': float(non_operational_costs),
            'non_operational_percent': non_operational_percent,
            'break_even': break_even,
            'top_products': top_products,
            'week_sales': week_sales,
            'alerts': alerts,
            'last_updated': now().isoformat(),
        })


class DailySalesSummary(APIView):
    """Resumen rápido de ventas del día para el usuario autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = now().date()
        qs = Venta.objects.filter(fecha=today)
        if request.user and request.user.is_authenticated:
            qs = qs.filter(usuario=request.user)
        total = qs.aggregate(total=Sum('total'))['total'] or 0
        count = qs.count()
        return Response({'count': count, 'total': total})
    

class InventoryActivityView(APIView):
    """Return hourly inventory movement counts for today."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = now().date()
        records = MovimientoInventario.objects.filter(fecha__date=today)

        hours = {h: 0 for h in range(8, 21)}
        for m in records:
            hour = m.fecha.hour
            if 8 <= hour <= 20:
                hours[hour] += 1

        data = [
            {"hour": f"{h:02d}:00", "value": count}
            for h, count in sorted(hours.items())
        ]
        return Response(data)


class EmployeeListCreateView(ListCreateAPIView):
    """API para listar y crear empleados."""

    queryset = get_user_model().objects.all().order_by("username")
    serializer_class = EmployeeSerializer
    
    def get_permissions(self):
        # Only administrators are allowed to list or create employees
        if self.request.method in ["GET", "POST"]:
            return [IsAdminUser()]
        return super().get_permissions()


class CurrentUserView(APIView):
    """Return basic information about the current authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = list(request.user.groups.values_list('name', flat=True))
        return Response({
            'username': request.user.username,
            'groups': groups,
            'is_superuser': request.user.is_superuser,
        })


class TransaccionViewSet(viewsets.ModelViewSet):
    """CRUD API para transacciones de flujo de caja."""

    queryset = Transaccion.objects.all().order_by("-fecha")
    serializer_class = TransaccionSerializer

    permission_classes = [IsFinanzasUser]

    def get_queryset(self):
        qs = super().get_queryset().select_related("responsable")
        categoria = self.request.query_params.get("categoria")
        responsable = self.request.query_params.get("responsable")
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        tipo = self.request.query_params.get("tipo")
        if categoria:
            qs = qs.filter(categoria=categoria)
        if responsable:
            qs = qs.filter(responsable_id=responsable)
        if start:
            qs = qs.filter(fecha__gte=start)
        if end:
            qs = qs.filter(fecha__lte=end)
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs


class FlujoCajaReportView(APIView):
    """Reportes de flujo de caja por periodo."""

    permission_classes = [IsFinanzasUser]

    def get(self, request):
        period = request.query_params.get("period", "month")
        qs = Transaccion.objects.all()
        categoria = request.query_params.get("categoria")
        responsable = request.query_params.get("responsable")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if categoria:
            qs = qs.filter(categoria=categoria)
        if responsable:
            qs = qs.filter(responsable_id=responsable)
        if start:
            qs = qs.filter(fecha__gte=start)
        if end:
            qs = qs.filter(fecha__lte=end)

        if period == "year":
            trunc = TruncYear("fecha")
            days_span = 365
        elif period == "quarter":
            trunc = TruncQuarter("fecha")
            days_span = 90
        else:
            trunc = TruncMonth("fecha")
            days_span = 30

        grouped = (
            qs.annotate(p=trunc)
            .values("p", "tipo")
            .annotate(total=Sum("monto"))
            .order_by("p")
        )

        result = []
        for item in grouped:
            promedio = float(item["total"]) / days_span
            result.append(
                {
                    "period": item["p"],
                    "tipo": item["tipo"],
                    "total": float(item["total"]),
                    "promedio_diario": promedio,
                }
            )
        return Response(result)
class BusinessEvolutionView(APIView):
    """Resumen histórico del negocio con proyecciones."""
    permission_classes = [IsFinanzasUser]

    def get(self, request):
        period = request.query_params.get("period", "month")
        category = request.query_params.get("category")
        canal = request.query_params.get("canal")
        ventas = Venta.objects.all()
        if category:
            ventas = ventas.filter(detallesventa__producto__categoria_id=category)
        ingresos = Transaccion.objects.filter(tipo="ingreso")
        egresos = Transaccion.objects.filter(tipo="egreso")
        if canal:
            ingresos = ingresos.filter(canal=canal)
        if period == "quarter":
            trunc = TruncQuarter("fecha")
        else:
            trunc = TruncMonth("fecha")
        sales_group = (
            ventas.annotate(p=trunc)
            .values("p")
            .annotate(count=Count("id"), total=Sum("total"))
            .order_by("p")
        )
        ing_group = (
            ingresos.annotate(p=trunc)
            .values("p")
            .annotate(total=Sum("monto"))
            .order_by("p")
        )
        eg_group = (
            egresos.annotate(p=trunc)
            .values("p")
            .annotate(total=Sum("monto"))
            .order_by("p")
        )
        ingresos_dict = {r["p"]: float(r["total"]) for r in ing_group}
        egresos_dict = {r["p"]: float(r["total"]) for r in eg_group}

        first_sales = {}
        for item in ventas.filter(cliente__isnull=False).order_by("fecha").values("cliente_id", "fecha"):
            cid = item["cliente_id"]
            if cid not in first_sales:
                first_sales[cid] = item["fecha"]
        new_clients = {}
        for d in first_sales.values():
            if period == "quarter":
                q_month = ((d.month - 1) // 3) * 3 + 1
                key = d.replace(month=q_month, day=1)
            else:
                key = d.replace(day=1)
            new_clients[key] = new_clients.get(key, 0) + 1

        result = []
        prev_income = None
        for item in sales_group:
            p = item["p"]
            income = ingresos_dict.get(p, 0.0)
            expense = egresos_dict.get(p, 0.0)
            net_income = income - expense
            margin = (net_income / income * 100) if income else 0.0
            growth = ((income - prev_income) / prev_income * 100) if prev_income else 0.0
            result.append({
                "period": p.isoformat(),
                "sales": item["count"],
                "new_clients": new_clients.get(p, 0),
                "net_income": net_income,
                "profit_margin": margin,
                "growth": growth,
            })
            prev_income = income

        y = [r["net_income"] for r in result]
        n = len(y)
        if n >= 2:
            x = list(range(n))
            x_mean = sum(x) / n
            y_mean = sum(y) / n
            denom = sum((xi - x_mean) ** 2 for xi in x)
            slope = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, y)) / denom if denom else 0.0
            intercept = y_mean - slope * x_mean
            if slope > 0:
                last_period = datetime.fromisoformat(result[-1]["period"])
                for i in range(1, 4):
                    if period == "quarter":
                        month = ((last_period.month - 1) // 3) * 3 + 1 + 3 * i
                    else:
                        month = last_period.month + i
                    year = last_period.year
                    while month > 12:
                        month -= 12
                        year += 1
                    next_date = last_period.replace(year=year, month=month, day=1)
                    pred = intercept + slope * (n - 1 + i)
                    result.append({
                        "period": next_date.isoformat(),
                        "sales": None,
                        "new_clients": None,
                        "net_income": pred,
                        "profit_margin": None,
                        "growth": None,
                        "projected": True,
                    })
        return Response(result)


class DevolucionViewSet(viewsets.ModelViewSet):
    """CRUD API para registros de devoluciones y defectos."""

    queryset = DevolucionProducto.objects.all().order_by("-fecha")
    serializer_class = DevolucionSerializer

    def get_queryset(self):
        return super().get_queryset().select_related("producto", "responsable")

    def get_permissions(self):
        if self.request.method in ["GET", "OPTIONS", "HEAD"]:
            return [IsAuthenticated()]
        return [IsAdminUser()]


class DevolucionRatesView(APIView):
    """Calcula tasas de devolución por producto, proveedor y responsable."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        today = now().date()
        month = int(request.query_params.get("month", today.month))
        year = int(request.query_params.get("year", today.year))

        devs = DevolucionProducto.objects.filter(fecha__year=year, fecha__month=month)
        sales = DetallesVenta.objects.filter(venta__fecha__year=year, venta__fecha__month=month)

        sales_by_product = {
            d["producto"]: d["total"] for d in sales.values("producto").annotate(total=Sum("cantidad"))
        }

        result_prod = []
        for item in devs.values(
            "producto",
            "producto__nombre",
            "lote_final__codigo",
        ).annotate(total=Sum("cantidad")):
            sold = sales_by_product.get(item["producto"], 0)
            rate = float(item["total"]) / float(sold) * 100 if sold else 0.0
            result_prod.append(
                {
                    "producto": item["producto"],
                    "nombre": item["producto__nombre"],
                    "lote_final": item["lote_final__codigo"],
                    "tasa": rate,
                    "alerta": rate > 5,
                }
            )

        sales_by_provider = {
            d["producto__proveedor"]: d["total"]
            for d in sales.values("producto__proveedor").annotate(total=Sum("cantidad"))
        }

        result_prov = []
        for item in devs.values("producto__proveedor", "producto__proveedor__nombre").annotate(total=Sum("cantidad")):
            prov = item["producto__proveedor"]
            sold = sales_by_provider.get(prov, 0)
            rate = float(item["total"]) / float(sold) * 100 if sold else 0.0
            result_prov.append(
                {
                    "proveedor": prov,
                    "nombre": item["producto__proveedor__nombre"],
                    "tasa": rate,
                }
            )

        result_resp = []
        for item in devs.values("responsable", "responsable__username").annotate(total=Sum("cantidad")):
            prods = devs.filter(responsable_id=item["responsable"]).values_list("producto", flat=True).distinct()
            total_sales = sum(sales_by_product.get(pid, 0) for pid in prods)
            rate = float(item["total"]) / float(total_sales) * 100 if total_sales else 0.0
            result_resp.append(
                {
                    "responsable": item["responsable"],
                    "nombre": item["responsable__username"],
                    "tasa": rate,
                }
            )

        return Response({
            "por_producto": result_prod,
            "por_proveedor": result_prov,
            "por_responsable": result_resp,
        })


class DevolucionLossReportView(APIView):
    """Reporte de pérdidas económicas por devoluciones."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        month = request.query_params.get("month")
        year = request.query_params.get("year")
        if month and year and not start and not end:
            start = datetime(int(year), int(month), 1).date()
            if int(month) == 12:
                end = datetime(int(year) + 1, 1, 1).date()
            else:
                end = datetime(int(year), int(month) + 1, 1).date()
        data = calcular_perdidas_devolucion(start, end)
        return Response(data)


class PriceHistoryView(APIView):
    """Lista el historial de precios para un producto."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        producto = request.query_params.get("producto")
        if not producto:
            return Response([], status=status.HTTP_400_BAD_REQUEST)
        qs = HistorialPrecio.objects.filter(producto_id=producto).order_by("fecha")
        data = [
            {
                "fecha": h.fecha.isoformat(),
                "precio": float(h.precio),
                "costo": float(h.costo),
            }
            for h in qs
        ]
        return Response(data)
    

class ClienteHistoryView(APIView):
    """Devuelve historial y resumen de un cliente."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        cliente = get_object_or_404(Cliente, pk=pk)
        ventas = (
            Venta.objects.filter(cliente=cliente)
            .order_by("-fecha")
            .values("id", "fecha", "total")
        )
        total = sum(float(v["total"]) for v in ventas)
        productos_qs = (
            DetallesVenta.objects.filter(venta__cliente=cliente)
            .values("producto__nombre")
            .annotate(total=Sum("cantidad"))
            .order_by("-total")[:5]
        )
        productos = [
            {"producto": p["producto__nombre"], "cantidad": p["total"]}
            for p in productos_qs
        ]
        ultima_compra = ventas[0]["fecha"].isoformat() if ventas else None
        data = {
            "ventas": list(ventas),
            "total_gastado": total,
            "productos_frecuentes": productos,
            "ultima_compra": ultima_compra,
        }
        return Response(data)


class MarginImpactView(APIView):
    """Muestra cómo los cambios de precios afectan al margen operativo."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        year = int(request.query_params.get("year", now().year))

        cambios = (
            HistorialPrecio.objects.filter(fecha__year=year)
            .annotate(m=TruncMonth("fecha"))
            .values("m")
            .annotate(count=Count("id"))
        )
        cambios_map = {c["m"].date(): c["count"] for c in cambios}

        ingresos = (
            Transaccion.objects.filter(tipo="ingreso", fecha__year=year)
            .annotate(m=TruncMonth("fecha"))
            .values("m")
            .annotate(total=Sum("monto"))
        )
        egresos = (
            Transaccion.objects.filter(tipo="egreso", fecha__year=year)
            .annotate(m=TruncMonth("fecha"))
            .values("m")
            .annotate(total=Sum("monto"))
        )
        ing_map = {i["m"].date(): i["total"] for i in ingresos}
        egr_map = {e["m"].date(): e["total"] for e in egresos}

        result = []
        for month in range(1, 13):
            dt = date(year, month, 1)
            income = float(ing_map.get(dt, 0) or 0)
            expense = float(egr_map.get(dt, 0) or 0)
            margin = (income - expense) / income * 100 if income else 0.0
            result.append(
                {
                    "period": dt.isoformat(),
                    "margin": margin,
                    "price_increases": cambios_map.get(dt, 0),
                }
            )

        return Response(result)


class InventoryAnalysisView(APIView):
    """Analiza patrones de rotación y ventas."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        start = _parse_date(request.query_params.get("start"))
        end = _parse_date(request.query_params.get("end"))
        rotation = rotation_report(start, end)
        associations = association_rules(start, end)
        recs = purchase_recommendations(start, end)
        return Response({
            "rotacion": rotation,
            "asociaciones": associations,
            "recomendaciones": recs,
        })


class MonthlyTrendsView(APIView):
    """Estadísticas mensuales para análisis de tendencias."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        year = int(request.query_params.get("year", now().year))
        start = date(year, 1, 1)
        end = date(year + 1, 1, 1)

        movs = (
            MovimientoInventario.objects.filter(fecha__date__gte=start, fecha__date__lt=end)
            .annotate(m=TruncMonth("fecha"))
            .values("m", "producto__nombre", "producto__tipo")
            .annotate(
                entradas=Sum(
                    Case(
                        When(tipo="entrada", then=F("cantidad")),
                        default=0,
                        output_field=models.DecimalField(max_digits=12, decimal_places=2),
                    )
                ),
                salidas=Sum(
                    Case(
                        When(tipo="salida", then=F("cantidad")),
                        default=0,
                        output_field=models.DecimalField(max_digits=12, decimal_places=2),
                    )
                ),
            )
            .order_by("m")
        )
        stock = [
            {
                "period": m["m"].isoformat(),
                "producto": m["producto__nombre"],
                "ingrediente": m["producto__tipo"].startswith("ingred"),
                "neto": float(m["entradas"] or 0) - float(m["salidas"] or 0),
            }
            for m in movs
        ]

        ventas = (
            DetallesVenta.objects.filter(venta__fecha__gte=start, venta__fecha__lt=end)
            .annotate(m=TruncMonth("venta__fecha"))
            .values("m", "producto__categoria__nombre_categoria")
            .annotate(
                total=Sum(
                    models.ExpressionWrapper(
                        F("cantidad") * F("precio_unitario"),
                        output_field=models.DecimalField(max_digits=12, decimal_places=2),
                    )
                )
            )
            .order_by("m")
        )
        sales = [
            {
                "period": v["m"].isoformat(),
                "categoria": v["producto__categoria__nombre_categoria"],
                "total": float(v["total"] or 0),
            }
            for v in ventas
        ]

        losses_dict = calcular_perdidas_devolucion(start, end).get("by_month", {})
        losses = [
            {"period": k, "loss": v}
            for k, v in sorted(losses_dict.items())
        ]

        precios = (
            HistorialPrecio.objects.filter(
                fecha__date__gte=start,
                fecha__date__lt=end,
                producto__tipo__startswith="ingred",
            )
            .annotate(m=TruncMonth("fecha"))
            .values("m")
            .annotate(avg=Avg("costo"))
            .order_by("m")
        )
        prices = [
            {
                "period": p["m"].isoformat(),
                "precio_promedio": float(p["avg"] or 0),
            }
            for p in precios
        ]

        return Response({
            "stock": stock,
            "sales": sales,
            "losses": losses,
            "prices": prices,
        })


class ProductionPlanView(APIView):
    """Sugerencias de producción diaria basadas en ventas históricas."""

    permission_classes = [IsProduccionUser]

    def get(self, request):
        fecha_str = request.query_params.get("fecha")
        if fecha_str:
            try:
                target = date.fromisoformat(fecha_str)
            except ValueError:
                return Response({"error": "Fecha inválida"}, status=400)
        else:
            target = now().date()
        plan = generar_plan(target)
        return Response(plan)


class RegistroTurnoViewSet(viewsets.ModelViewSet):
    """CRUD API para registros de turnos del personal."""

    queryset = RegistroTurno.objects.all().order_by("-fecha", "turno")
    serializer_class = RegistroTurnoSerializer

    permission_classes = [IsProduccionUser]

    def get_queryset(self):
        return super().get_queryset().prefetch_related("empleados")


class TraceabilityView(APIView):
    """Devuelve el historial de uso de un lote de materia prima."""

    permission_classes = [IsAuthenticated]

    def get(self, request, codigo):
        try:
            lote = LoteMateriaPrima.objects.get(codigo=codigo)
        except LoteMateriaPrima.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        usos_data = []
        for uso in lote.usos.select_related("lote_producto_final", "lote_producto_final__producto"):
            lpf = uso.lote_producto_final
            vendidos = (
                lpf.detallesventa_set.aggregate(total=Sum("cantidad"))["total"] or 0
            )
            devueltos = (
                DevolucionProducto.objects.filter(lote_final=lpf).aggregate(total=Sum("cantidad"))["total"]
                or 0
            )
            en_stock = lpf.cantidad_producida - vendidos - devueltos
            usos_data.append(
                {
                    "lote_final": lpf.codigo,
                    "producto_final": lpf.producto.nombre,
                    "fecha_produccion": lpf.fecha_produccion,
                    "fecha_uso": uso.fecha,
                    "cantidad_utilizada": uso.cantidad,
                    "vendidos": vendidos,
                    "devueltos": devueltos,
                    "en_stock": en_stock,
                }
            )

        data = {
            "lote": lote.codigo,
            "producto": lote.producto.nombre,
            "fecha_recepcion": lote.fecha_recepcion,
            "usos": usos_data,
        }
        return Response(data)


class ReorderSuggestionView(APIView):
    """Sugiere y confirma reordenes automáticos."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        horizon = int(request.query_params.get("horizon", 7))
        sugerencias = detectar_faltantes(horizon)
        return Response(sugerencias)

    def post(self, request):
        horizon = int(request.data.get("horizon", 7))
        ids = auto_reordenar(confirmar=True, horizon_days=horizon)
        return Response({"compras": ids})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API de solo lectura para revisar entradas de auditoría."""

    queryset = AuditLog.objects.all().order_by("-fecha")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset().select_related("usuario", "tipo_contenido")
        modelo = self.request.query_params.get("modelo")
        if modelo:
            try:
                app_label, model_name = modelo.split(".")
                ct = ContentType.objects.get(app_label=app_label, model=model_name)
                qs = qs.filter(tipo_contenido=ct)
            except (ValueError, ContentType.DoesNotExist):
                pass
        return qs