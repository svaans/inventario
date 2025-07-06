from django.db.models import F
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from .models import Producto
from .serializers import CriticalProductSerializer, ProductoSerializer


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


class ProductoListCreateView(ListCreateAPIView):
    queryset = Producto.objects.all().order_by("nombre")
    serializer_class = ProductoSerializer
    pagination_class = ProductoPagination
    permission_classes = [AllowAny]