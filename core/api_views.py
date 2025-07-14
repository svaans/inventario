from django.db.models import F, Sum
from django.db.models.functions import TruncMonth, TruncQuarter, TruncYear
from django.utils.timezone import now
from datetime import timedelta
import logging
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class IsAdminUser(BasePermission):
    """Allow access to admin group members and superusers."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and (
                request.user.is_superuser
                or request.user.groups.filter(name="admin").exists()
            )
        )

from .models import (
    Producto,
    Venta,
    DetallesVenta,
    MovimientoInventario,
    Compra,
    Categoria,
    Cliente,
    Transaccion,
)
from .serializers import (
    CriticalProductSerializer,
    ProductoSerializer,
    VentaSerializer,
    VentaCreateSerializer,
    CategoriaSerializer,
    ClienteSerializer,
    EmployeeSerializer,
    TransaccionSerializer,
)


class CriticalProductPagination(PageNumberPagination):
    page_size = 20


class CriticalProductListView(ListAPIView):
    queryset = Producto.objects.all()
    serializer_class = CriticalProductSerializer
    pagination_class = CriticalProductPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Producto.objects.filter(stock_actual__lte=F("stock_minimo")).order_by("nombre")


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
        qs = super().get_queryset()
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
                return Response({"categoria": ["Invalid id"]}, status=status.HTTP_400_BAD_REQUEST)
        if "ingredientes" in data and isinstance(data["ingredientes"], list):
            for comp in data["ingredientes"]:
                try:
                    comp["ingrediente"] = int(comp["ingrediente"])
                except (TypeError, ValueError, KeyError):
                    return Response({"ingredientes": ["Invalid ingrediente id"]}, status=status.HTTP_400_BAD_REQUEST)
                
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

class ClienteListView(ListAPIView):
    """API para autocompletar clientes."""

    queryset = Cliente.objects.all().order_by("nombre")
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(nombre__icontains=q)
        return qs

class VentaPagination(PageNumberPagination):
    page_size = 20


class VentaListCreateView(ListCreateAPIView):
    queryset = Venta.objects.all().order_by("-fecha")
    serializer_class = VentaSerializer
    pagination_class = VentaPagination


    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return VentaCreateSerializer
        return VentaSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
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

    def get_permissions(self):
        if self.request.method in ["GET", "OPTIONS", "HEAD"]:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
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

    permission_classes = [IsAuthenticated]

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