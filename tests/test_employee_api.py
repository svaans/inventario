from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

class EmployeeAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_employee(self):
        data = {
            "username": "empleado1",
            "password": "pass1234",
            "first_name": "Empleado",
            "email": "empleado1@example.com",
        }
        response = self.client.post("/api/empleados/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.filter(username="empleado1").count(), 1)