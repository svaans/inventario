from django.db.models import F, Sum
from django.utils.timezone import now
from datetime import timedelta
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Producto, Venta, DetallesVenta, MovimientoInventario, Compra
from .serializers import (
    CriticalProductSerializer,
    ProductoSerializer,
    VentaSerializer,
    VentaCreateSerializer,
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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