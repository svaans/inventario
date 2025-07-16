from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient

class DashboardDefaultsAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_dashboard_returns_defaults_when_no_data(self):
        resp = self.client.get("/api/dashboard/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["sales_today"], 0)
        self.assertEqual(data["sales_week"], 0)
        self.assertEqual(data["total_products"], 0)
        self.assertEqual(data["low_stock"], 0)
        self.assertEqual(data["out_stock"], 0)
        self.assertEqual(data["inventory_value"], 0)
        self.assertEqual(data["production_today"], 0)
        self.assertEqual(data["fixed_costs"], 0)
        self.assertEqual(data["variable_costs"], 0)
        self.assertEqual(data["operational_costs"], 0.0)
        self.assertEqual(data["non_operational_costs"], 0.0)
        self.assertEqual(data["non_operational_percent"], 0.0)
        self.assertIsNone(data["break_even"])
        self.assertEqual(data["top_products"], [])
        self.assertEqual(len(data["week_sales"]), 7)
        self.assertEqual(data["alerts"], [])