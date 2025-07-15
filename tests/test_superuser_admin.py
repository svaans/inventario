from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from inventario.models import Categoria, Proveedor

class SuperuserAdminTest(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username="super", email="super@example.com", password="pass"
        )
        self.client = Client()
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.superuser)
        self.categoria = Categoria.objects.create(nombre_categoria="Prueba")
        self.proveedor = Proveedor.objects.create(nombre="Prov", contacto="1", direccion="d")

    def test_superuser_login_redirects_to_dashboard(self):
        response = self.client.post("/login/", {"username": "super", "password": "pass"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/dashboard/")

    def test_superuser_can_create_product(self):
        data = {
            "codigo": "S1",
            "nombre": "Prod",
            "descripcion": "",
            "tipo": "empanada",
            "precio": 1.0,
            "costo": 0.5,
            "stock_actual": 10,
            "stock_minimo": 1,
            "unidad_media": "unidad",
            "categoria": self.categoria.id,
            "proveedor": self.proveedor.id,
        }
        response = self.api_client.post("/api/productos/", data, format="json")
        self.assertEqual(response.status_code, 201)