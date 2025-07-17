from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, Cliente, Venta, DetallesVenta

class ClienteHistoryAPITest(TestCase):
    def setUp(self):
        ventas_group, _ = Group.objects.get_or_create(name="ventas")
        self.user = User.objects.create_user(username="u", password="p")
        self.user.groups.add(ventas_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        cat = Categoria.objects.create(nombre_categoria="General")
        prod = Producto.objects.create(
            codigo="P1",
            nombre="Prod",
            tipo="empanada",
            precio=2,
            costo=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media="u",
            categoria=cat,
        )
        self.cliente = Cliente.objects.create(nombre="Juan", contacto="123")
        venta = Venta.objects.create(
            fecha="2024-01-01",
            total=10,
            usuario=self.user,
            cliente=self.cliente,
        )
        DetallesVenta.objects.create(
            venta=venta,
            producto=prod,
            cantidad=1,
            precio_unitario=2,
        )

    def test_history_endpoint(self):
        resp = self.client.get(f"/api/clientes/{self.cliente.id}/historial/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["ventas"]), 1)
        self.assertEqual(data["total_gastado"], 10.0)