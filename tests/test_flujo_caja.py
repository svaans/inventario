from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from core.models import Transaccion

class FlujoCajaAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_no_duplicate_expense(self):
        data = {
            "fecha": "2024-01-01",
            "monto": "10.00",
            "tipo": "egreso",
            "categoria": "sueldos",
            "responsable": self.user.id,
        }
        r1 = self.client.post("/api/transacciones/", data, format="json")
        self.assertEqual(r1.status_code, 201)
        r2 = self.client.post("/api/transacciones/", data, format="json")
        self.assertEqual(r2.status_code, 400)

    def test_monthly_report(self):
        Transaccion.objects.create(
            fecha="2024-01-10",
            monto=100,
            tipo="ingreso",
            categoria="mostrador",
            responsable=self.user,
        )
        Transaccion.objects.create(
            fecha="2024-01-15",
            monto=50,
            tipo="egreso",
            categoria="sueldos",
            responsable=self.user,
        )
        resp = self.client.get("/api/flujo-caja/?period=month")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(any(item["tipo"] == "ingreso" and item["total"] == 100.0 for item in data))
        self.assertTrue(any(item["tipo"] == "egreso" and item["total"] == 50.0 for item in data))