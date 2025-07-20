from django.test import TestCase
from django.contrib.auth.models import User, Group
from inventario.models import (
    Categoria,
    Producto,
    Venta,
    DetallesVenta,
    DevolucionProducto,
    LoteProductoFinal,
    UnidadMedida,
)
from finanzas.models import Transaccion
from finanzas.utils import compile_monthly_metrics

class MonthlyMetricsTest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        cat = Categoria.objects.create(nombre_categoria="General")
        unidad = UnidadMedida.objects.get(abreviatura="u")
        self.prod = Producto.objects.create(
            codigo="P1",
            nombre="Prod",
            tipo="empanada",
            precio=2,
            costo=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        self.lote_final = LoteProductoFinal.objects.create(
            codigo="A1",
            producto=self.prod,
            fecha_produccion="2024-02-01",
            cantidad_producida=10,
        )
        venta = Venta.objects.create(fecha="2024-02-01", total=20, usuario=self.user)
        DetallesVenta.objects.create(venta=venta, producto=self.prod, cantidad=10, precio_unitario=2)
        Transaccion.objects.create(
            fecha="2024-02-05",
            monto=5,
            tipo="egreso",
            categoria="sueldos",
            responsable=self.user,
            operativo=True,
        )
        DevolucionProducto.objects.create(
            fecha="2024-02-10",
            lote_final=self.lote_final,
            producto=self.prod,
            motivo="Defecto",
            cantidad=1,
            responsable=self.user,
        )

    def test_metrics_keys(self):
        data = compile_monthly_metrics(2024, 2)
        self.assertAlmostEqual(data["total_sales"], 20.0)
        self.assertAlmostEqual(data["operating_costs"], 5.0)
        self.assertIn("critical_inventory", data)
        self.assertIn("losses_returns", data)
        self.assertIn("demand_projection", data)
        self.assertIn("alerts", data)