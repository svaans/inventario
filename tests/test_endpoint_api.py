from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User, Group
from inventario.models import Producto, Categoria, Proveedor, MovimientoInventario, UnidadMedida
class ProductoAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
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
            "unidad_media": UnidadMedida.objects.get(abreviatura="botella").id,
            "categoria": self.categoria.id,
            "proveedor": self.proveedor.id,
        }
        response = self.client.post("/api/productos/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Producto.objects.count(), 1)
        producto = Producto.objects.first()
        self.assertEqual(producto.categoria, self.categoria)

    def test_eliminar_producto(self):
        data = {
            "codigo": "P002",
            "nombre": "Fanta",
            "descripcion": "Bebida naranja",
            "tipo": "empanada",
            "precio": 1.0,
            "costo": 0.4,
            "stock_actual": 50,
            "stock_minimo": 5,
            "unidad_media": UnidadMedida.objects.get(abreviatura="botella").id,
            "categoria": self.categoria.id,
            "proveedor": self.proveedor.id,
        }
        response = self.client.post("/api/productos/", data, format="json")
        self.assertEqual(response.status_code, 201)
        producto_id = response.data["id"]

        delete_resp = self.client.delete(f"/api/productos/{producto_id}/")
        self.assertEqual(delete_resp.status_code, 204)
        self.assertEqual(Producto.objects.count(), 0)
        self.assertEqual(MovimientoInventario.objects.count(), 1)
        movimiento = MovimientoInventario.objects.first()
        self.assertEqual(movimiento.tipo, "salida")
        self.assertEqual(float(movimiento.cantidad), 50)

    def test_crear_producto_con_nombre_de_proveedor(self):
        data = {
            "codigo": "P003",
            "nombre": "Sprite",
            "descripcion": "Bebida clara",
            "tipo": "empanada",
            "precio": 1.2,
            "costo": 0.4,
            "stock_actual": 30,
            "stock_minimo": 5,
            "unidad_media": UnidadMedida.objects.get(abreviatura="botella").id,
            "categoria": self.categoria.id,
            "proveedor": "Nuevo proveedor",
        }
        response = self.client.post("/api/productos/", data, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Proveedor.objects.filter(nombre__iexact="Nuevo proveedor").count(), 1)
        producto = Producto.objects.get(codigo="P003")
        self.assertIsNotNone(producto.proveedor)
        self.assertEqual(producto.proveedor.nombre, "Nuevo proveedor")
        self.assertEqual(producto.proveedor.contacto, "Nuevo proveedor")
