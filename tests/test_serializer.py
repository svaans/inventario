from django.test import TestCase
from core.models import Producto, Categoria, Proveedor
from core.serializers import ProductoSerializer

class ProductoSerializerTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre_categoria="Prueba")
        self.proveedor = Proveedor.objects.create(nombre="Proveedor X", contacto="123", direccion="Dirección")

    def test_producto_con_categoria_valida(self):
        data = {
            "codigo": "T123",
            "nombre": "Test Producto",
            "descripcion": "Descripción",
            "tipo": "empanada",
            "precio": "12.50",
            "costo": "5.00",
            "stock_actual": "20.00",
            "stock_minimo": "5.00",
            "unidad_media": "unidad",
            "categoria": self.categoria.id,
            "proveedor": self.proveedor.id
        }
        serializer = ProductoSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

