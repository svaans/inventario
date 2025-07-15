from django.test import TransactionTestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from core.models import RegistroTurno

class ShiftLogAPITest(TransactionTestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.admin = User.objects.create_user(username="admin", password="pass")
        self.admin.groups.add(admin_group)
        self.emp = User.objects.create_user(username="emp", password="pass")
        self.client = APIClient()

    def test_create_requires_admin(self):
        self.client.force_authenticate(user=self.emp)
        data = {
            "fecha": "2024-01-01",
            "turno": "manana",
            "empleados": [self.emp.id],
            "produccion": 20,
            "ventas": "50.00",
            "horas_trabajadas": 8,
        }
        resp = self.client.post("/api/shift-logs/", data, format="json")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(RegistroTurno.objects.count(), 0)

    def test_admin_can_create_and_list(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "fecha": "2024-01-01",
            "turno": "manana",
            "empleados": [self.emp.id],
            "produccion": 40,
            "ventas": "80.00",
            "horas_trabajadas": 8,
        }
        resp = self.client.post("/api/shift-logs/", data, format="json")
        self.assertEqual(resp.status_code, 201)
        log = RegistroTurno.objects.get()
        self.assertAlmostEqual(log.eficiencia, 5.0)
        resp = self.client.get("/api/shift-logs/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)