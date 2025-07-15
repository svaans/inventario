from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, Venta, DetallesVenta, DevolucionProducto
class DevolucionAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.cat = Categoria.objects.create(nombre_categoria="Empanadas")
        self.prod = Producto.objects.create(
            codigo="E1",
            nombre="Empanada Pollo",
            tipo="empanada",
            precio=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media="u",
            categoria=self.cat,
        )

    def test_crear_devolucion(self):
        data = {
            "fecha": "2024-01-05",
            "lote": "L1",
            "producto": self.prod.id,
            "motivo": "Quemada",
            "cantidad": 2,
            "responsable": self.user.id,
            "reembolso": True,
            "sustitucion": False,
        }
        resp = self.client.post("/api/devoluciones/", data, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(DevolucionProducto.objects.count(), 1)

class DevolucionRateAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.cat = Categoria.objects.create(nombre_categoria="Empanadas")
        self.prod = Producto.objects.create(
            codigo="E2",
            nombre="Empanada Carne",
            tipo="empanada",
            precio=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media="u",
            categoria=self.cat,
        )
        venta = Venta.objects.create(fecha="2024-01-01", total=10, usuario=self.user)
        DetallesVenta.objects.create(venta=venta, producto=self.prod, cantidad=10, precio_unitario=1)
        DevolucionProducto.objects.create(
            fecha="2024-01-02",
            lote="L1",
            producto=self.prod,
            motivo="Mala",
            cantidad=1,
            responsable=self.user,
        )

    def test_rate_alert(self):
        resp = self.client.get("/api/devoluciones/rates/?month=1&year=2024")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["por_producto"][0]["alerta"]) 