from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from datetime import date
from inventario.models import (
    Categoria,
    Producto,
    Venta,
    DetallesVenta,
    ComposicionProducto,
)
from produccion.models import EventoEspecial, CapacidadTurno


class ProductionPlanAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        cat = Categoria.objects.create(nombre_categoria="Empanadas")
        self.emp = Producto.objects.create(
            codigo="E1",
            nombre="Empanada",
            tipo="empanada",
            precio=2,
            stock_actual=0,
            stock_minimo=1,
            unidad_media="u",
            categoria=cat,
        )
        self.ing = Producto.objects.create(
            codigo="I1",
            nombre="Harina",
            tipo="ingredientes",
            precio=0,
            costo=0,
            stock_actual=20,
            stock_minimo=1,
            unidad_media="kg",
            categoria=cat,
        )
        ComposicionProducto.objects.create(
            producto_final=self.emp,
            ingrediente=self.ing,
            cantidad_requerida=1,
        )
        for d in [date(2024, 1, 1), date(2024, 1, 8), date(2024, 1, 15), date(2024, 1, 22)]:
            venta = Venta.objects.create(fecha=d, total=20, usuario=self.user)
            DetallesVenta.objects.create(venta=venta, producto=self.emp, cantidad=10, precio_unitario=2)
        EventoEspecial.objects.create(fecha=date(2024, 1, 29), nombre="Fiesta", factor_demanda=1.5)
        CapacidadTurno.objects.create(fecha=date(2024, 1, 29), turno="manana", capacidad=15)

    def test_plan_returns_suggestions(self):
        resp = self.client.get("/api/production-plan/?fecha=2024-01-29")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["fecha"], "2024-01-29")
        self.assertTrue(data["plan"])
        emp_plan = data["plan"][0]
        self.assertEqual(emp_plan["unidades"], 15)
        self.assertFalse(data["alerts"])