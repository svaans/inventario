from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.test import APIRequestFactory
from inventario.models import Categoria, Producto, UnidadMedida, FamiliaProducto
from inventario.serializers import VentaCreateSerializer

class NegativeStockTest(TestCase):
    def setUp(self):
        fam_emp = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.EMPANADAS)
        self.categoria = Categoria.objects.create(nombre_categoria="Negativa", familia=fam_emp)
        unidad = UnidadMedida.objects.get(abreviatura="u")
        self.producto = Producto.objects.create(
            codigo="N1",
            nombre="Negativo",
            tipo="empanada",
            precio=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=self.categoria,
        )
        self.user = User.objects.create_user(username="u", password="p")

    def test_venta_con_stock_insuficiente(self):
        factory = APIRequestFactory()
        request = factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-01",
            "cliente": None,
            "detalles": [
                {"producto": self.producto.id, "cantidad": 10, "precio_unitario": 1}
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(serializers.ValidationError):
            serializer.save()

    def test_venta_bajo_stock_minimo(self):
        factory = APIRequestFactory()
        request = factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-02",
            "cliente": None,
            "detalles": [
                {"producto": self.producto.id, "cantidad": 5, "precio_unitario": 1}
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(serializers.ValidationError):
            serializer.save()