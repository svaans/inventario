from datetime import date
from django.test import TestCase
from django.contrib.auth.models import User, Group
from inventario.models import (
    Categoria,
    Producto,
    Venta,
    DetallesVenta,
    UnidadMedida,
)
from core.analytics import association_rules


class AssociationRulesPerformanceTest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        cat = Categoria.objects.create(nombre_categoria="General")
        unidad = UnidadMedida.objects.get(abreviatura="u")
        self.p1 = Producto.objects.create(
            codigo="A1",
            nombre="ProdA",
            tipo="empanada",
            precio=1,
            costo=0,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        self.p2 = Producto.objects.create(
            codigo="B1",
            nombre="ProdB",
            tipo="empanada",
            precio=1,
            costo=0,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        self.p3 = Producto.objects.create(
            codigo="C1",
            nombre="ProdC",
            tipo="empanada",
            precio=1,
            costo=0,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )

    def test_large_dataset_performance(self):
        start = date(2024, 1, 1)
        end = date(2024, 1, 1)
        for i in range(500):
            venta = Venta.objects.create(fecha=start, total=0, usuario=self.user)
            DetallesVenta.objects.create(venta=venta, producto=self.p1, cantidad=1, precio_unitario=1)
            DetallesVenta.objects.create(venta=venta, producto=self.p2, cantidad=1, precio_unitario=1)
            if i % 2 == 0:
                DetallesVenta.objects.create(venta=venta, producto=self.p3, cantidad=1, precio_unitario=1)
        with self.assertNumQueries(2):
            rules = association_rules(start=start, end=end, min_support=0.01, min_confidence=0.01)
        self.assertTrue(any(r["producto_a"] == self.p1.id and r["producto_b"] == self.p2.id for r in rules))