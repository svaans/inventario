from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from core.models import Transaccion
from django.utils import timezone
from unittest.mock import patch
from datetime import timezone as dt_timezone

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

    def test_non_operational_percent_on_dashboard(self):
        with patch("core.api_views.now") as mock_now:
            mock_now.return_value = timezone.datetime(2024, 1, 10, tzinfo=dt_timezone.utc)
            Transaccion.objects.create(
                fecha="2024-01-01",
                monto=80,
                tipo="egreso",
                categoria="sueldos",
                responsable=self.user,
                operativo=True,
                actividad="produccion",
            )
            Transaccion.objects.create(
                fecha="2024-01-02",
                monto=20,
                tipo="egreso",
                categoria="otros",
                responsable=self.user,
                operativo=False,
                actividad="administracion",
            )

            resp = self.client.get("/api/dashboard/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["operational_costs"], 80.0)
        self.assertEqual(data["non_operational_costs"], 20.0)
        self.assertAlmostEqual(data["non_operational_percent"], 20.0)