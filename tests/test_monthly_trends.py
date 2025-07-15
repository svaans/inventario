from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from core.models import Categoria, Producto, MovimientoInventario, Venta, DetallesVenta, DevolucionProducto, HistorialPrecio
from datetime import datetime

class MonthlyTrendsAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        cat = Categoria.objects.create(nombre_categoria="Empanadas")
        self.prod = Producto.objects.create(
            codigo="E1",
            nombre="Empanada",
            tipo="empanada",
            precio=2,
            costo=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media="u",
            categoria=cat,
        )
        self.ing = Producto.objects.create(
            codigo="I1",
            nombre="Carne",
            tipo="ingredientes",
            es_ingrediente=True,
            precio=0,
            costo=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media="kg",
            categoria=cat,
        )

        m1 = MovimientoInventario.objects.create(producto=self.prod, tipo="entrada", cantidad=5, motivo="prod")
        m1.fecha = datetime(2024, 1, 5)
        m1.save(update_fields=["fecha"])
        m2 = MovimientoInventario.objects.create(producto=self.ing, tipo="entrada", cantidad=3, motivo="compra")
        m2.fecha = datetime(2024, 1, 10)
        m2.save(update_fields=["fecha"])

        venta = Venta.objects.create(fecha="2024-01-15", total=4, usuario=self.user)
        DetallesVenta.objects.create(venta=venta, producto=self.prod, cantidad=2, precio_unitario=2)

        DevolucionProducto.objects.create(
            fecha="2024-01-20",
            lote="L1",
            producto=self.prod,
            motivo="malo",
            cantidad=1,
            responsable=self.user,
        )

        HistorialPrecio.objects.create(producto=self.ing, precio=0, costo=1.5, fecha="2024-01-03")

    def test_endpoint_returns_data(self):
        resp = self.client.get("/api/monthly-trends/?year=2024")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("stock", data)
        self.assertIn("sales", data)
        self.assertIn("losses", data)
        self.assertIn("prices", data)
        self.assertTrue(any(item["period"].startswith("2024-01") for item in data["stock"]))