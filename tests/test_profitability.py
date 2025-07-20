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
from finanzas.profitability import monthly_profitability_ranking
class ProfitabilityRankingTest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        cat = Categoria.objects.create(nombre_categoria="General")
        unidad = UnidadMedida.objects.get(abreviatura="u")
        self.p1 = Producto.objects.create(
            codigo="PR1",
            nombre="Prod1",
            tipo="empanada",
            precio=3,
            costo=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        self.p2 = Producto.objects.create(
            codigo="PR2",
            nombre="Prod2",
            tipo="empanada",
            precio=2,
            costo=1.5,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        self.lote_final = LoteProductoFinal.objects.create(
            codigo="A1",
            producto=self.p2,
            fecha_produccion="2024-01-10",
            cantidad_producida=5,
        )
        venta = Venta.objects.create(fecha="2024-01-10", total=40, usuario=self.user)
        DetallesVenta.objects.create(venta=venta, producto=self.p1, cantidad=10, precio_unitario=3)
        DetallesVenta.objects.create(venta=venta, producto=self.p2, cantidad=5, precio_unitario=2)
        Transaccion.objects.create(
            fecha="2024-01-05",
            monto=10,
            tipo="egreso",
            categoria="sueldos",
            responsable=self.user,
            tipo_costo="fijo",
        )
        DevolucionProducto.objects.create(
            fecha="2024-01-15",
            lote_final=self.lote_final,
            producto=self.p2,
            motivo="Defecto",
            cantidad=1,
            responsable=self.user,
        )

    def test_ranking(self):
        data = monthly_profitability_ranking(2024, 1)
        self.assertEqual(data["most_profitable"][0]["nombre"], self.p1.nombre)
        self.assertEqual(data["least_profitable"][0]["nombre"], self.p2.nombre)