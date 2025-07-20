from django.test import TestCase, Client
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, UnidadMedida

class RoleAccessTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        cat = Categoria.objects.create(nombre_categoria="General")
        unidad = UnidadMedida.objects.get(abreviatura="u")
        self.product = Producto.objects.create(
            codigo="P1",
            nombre="Prod",
            tipo="empanada",
            precio=1,
            costo=0.5,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )

    def _create_user(self, username, group):
        user = User.objects.create_user(username=username, password="pass")
        g, _ = Group.objects.get_or_create(name=group)
        user.groups.add(g)
        return user

    def test_ventas_user_access(self):
        user = self._create_user("vendedor", "ventas")
        self.api_client.force_authenticate(user=user)
        self.client.force_login(user)
        resp = self.api_client.get("/api/ventas/")
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get("/balance/")
        self.assertEqual(resp.status_code, 403)

    def test_finanzas_user_access(self):
        user = self._create_user("financiero", "finanzas")
        self.api_client.force_authenticate(user=user)
        resp = self.api_client.get("/api/transacciones/")
        self.assertEqual(resp.status_code, 200)
        resp = self.api_client.get("/api/production-plan/?fecha=2025-01-01")
        self.assertEqual(resp.status_code, 403)

    def test_produccion_user_access(self):
        user = self._create_user("prod", "produccion")
        self.api_client.force_authenticate(user=user)
        resp = self.api_client.get("/api/production-plan/?fecha=2025-01-01")
        self.assertEqual(resp.status_code, 200)
        resp = self.api_client.get("/api/transacciones/")
        self.assertEqual(resp.status_code, 403)