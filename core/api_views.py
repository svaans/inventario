from django.db.models import F, Sum
from django.utils.timezone import now
from datetime import timedelta
import logging
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import (
    Producto,
    Venta,
    DetallesVenta,
    MovimientoInventario,
    Compra,
    Categoria,
    Cliente,
)
from .serializers import (
    CriticalProductSerializer,
    ProductoSerializer,
    VentaSerializer,
    VentaCreateSerializer,
    CategoriaSerializer,
    ClienteSerializer,
)


class CriticalProductPagination(PageNumberPagination):
    page_size = 20


class CriticalProductListView(ListAPIView):
    queryset = Producto.objects.all()
    serializer_class = CriticalProductSerializer
    pagination_class = CriticalProductPagination
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Producto.objects.filter(stock_actual__lte=F("stock_minimo")).order_by("nombre")


class ProductoPagination(PageNumberPagination):
    page_size = 20


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all().order_by("nombre")
    serializer_class = ProductoSerializer
    pagination_class = ProductoPagination
    permission_classes = [AllowAny]

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

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            logging.error("Product validation failed: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        """Delete a product and register the removal in inventory."""
        instance = self.get_object()
        if instance.stock_actual > 0:
            MovimientoInventario.objects.create(
                producto=instance,
                tipo="salida",
                cantidad=instance.stock_actual,
                motivo="Eliminación de producto",
            )
        return super().destroy(request, *args, **kwargs)


class CategoriaListView(ListAPIView):
    """API pública para listar categorías de productos."""

    queryset = Categoria.objects.all().order_by("nombre_categoria")
    serializer_class = CategoriaSerializer
    permission_classes = [AllowAny]

class ClienteListView(ListAPIView):
    """API para autocompletar clientes."""

    queryset = Cliente.objects.all().order_by("nombre")
    serializer_class = ClienteSerializer
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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

    permission_classes = [AllowAny]

    def get(self, request):
        today = now().date()
        qs = Venta.objects.filter(fecha=today)
        if request.user and request.user.is_authenticated:
            qs = qs.filter(usuario=request.user)
        total = qs.aggregate(total=Sum('total'))['total'] or 0
        count = qs.count()
        return Response({'count': count, 'total': total})