from django.test import TestCase
from rest_framework.test import APIClient
from core.models import Producto, Categoria, Proveedor

class ProductoAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.categoria = Categoria.objects.create(nombre_categoria="Bebidas")
        self.proveedor = Proveedor.objects.create(nombre="Proveedor 1", contacto="123", direccion="Calle falsa 123")

    def test_crear_producto_asignado_a_categoria(self):
        data = {
            "codigo": "P001",
            "nombre": "Coca Cola",
            "descripcion": "Bebida gaseosa",
            "tipo": "empanada",
            "precio": 1.5,
            "costo": 0.5,
            "stock_actual": 100,
            "stock_minimo": 10,
            "unidad_media": "botella",
            "categoria": self.categoria.id,
            "proveedor": self.proveedor.id
        }
        response = self.client.post("/api/productos/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Producto.objects.count(), 1)
        producto = Producto.objects.first()
        self.assertEqual(producto.categoria, self.categoria)
