from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, Venta, DetallesVenta, UnidadMedida
class InventoryAnalysisAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        cat = Categoria.objects.create(nombre_categoria="Empanadas")
        unidad = UnidadMedida.objects.get(abreviatura="u")
        self.p1 = Producto.objects.create(
            codigo="E1",
            nombre="Empanada carne",
            tipo="empanada",
            precio=2,
            costo=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        self.p2 = Producto.objects.create(
            codigo="S1",
            nombre="Salsa roja",
            tipo="ingredientes",
            precio=0,
            costo=0,
            stock_actual=2,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        venta = Venta.objects.create(fecha="2024-01-01", total=4, usuario=self.user)
        DetallesVenta.objects.create(venta=venta, producto=self.p1, cantidad=2, precio_unitario=2)
        DetallesVenta.objects.create(venta=venta, producto=self.p2, cantidad=2, precio_unitario=0)

    def test_returns_analysis(self):
        resp = self.client.get("/api/inventory-analysis/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("rotacion", data)
        self.assertIn("asociaciones", data)
        self.assertIn("recomendaciones", data)
        self.assertIsInstance(data["rotacion"].get("alta_rotacion"), list)