from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient

class EmployeeAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_employee_requires_auth(self):
        data = {
            "username": "empleado1",
            "password": "pass1234",
            "first_name": "Empleado",
            "email": "empleado1@example.com",
        }
        response = self.client.post("/api/empleados/", data, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(User.objects.filter(username="empleado1").count(), 0)

    def test_admin_can_create_employee(self):
        admin = User.objects.create_user(username="admin", password="pass")
        admin_group, _ = Group.objects.get_or_create(name="admin")
        admin.groups.add(admin_group)
        self.client.force_authenticate(user=admin)
        data = {
            "username": "empleado1",
            "password": "pass1234",
            "first_name": "Empleado",
            "email": "empleado1@example.com",
        }
        response = self.client.post("/api/empleados/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.filter(username="empleado1").count(), 1)