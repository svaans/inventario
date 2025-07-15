from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User, Group
from inventario.models import (
    Categoria,
    Producto,
    Venta,
    DetallesVenta,
    DevolucionProducto,
    LoteMateriaPrima,
    LoteProductoFinal,
    UsoLoteMateriaPrima,
)


class TraceabilityAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        cat = Categoria.objects.create(nombre_categoria="Insumos")
        self.ing = Producto.objects.create(
            codigo="ING1",
            nombre="Harina",
            tipo="ingredientes",
            es_ingrediente=True,
            precio=0,
            costo=0,
            stock_actual=100,
            stock_minimo=10,
            unidad_media="kg",
            categoria=cat,
        )
        self.final = Producto.objects.create(
            codigo="PROD1",
            nombre="Pan",
            tipo="empanada",
            es_ingrediente=False,
            precio=2,
            costo=1,
            stock_actual=10,
            stock_minimo=2,
            unidad_media="u",
            categoria=cat,
        )
        self.lote_ing = LoteMateriaPrima.objects.create(
            codigo="L1",
            producto=self.ing,
            fecha_recepcion="2024-01-01",
            cantidad_inicial=50,
        )
        self.lote_final = LoteProductoFinal.objects.create(
            codigo="FP1",
            producto=self.final,
            fecha_produccion="2024-01-02",
            cantidad_producida=20,
        )
        UsoLoteMateriaPrima.objects.create(
            lote_materia_prima=self.lote_ing,
            lote_producto_final=self.lote_final,
            fecha="2024-01-02",
            cantidad=10,
        )
        venta = Venta.objects.create(fecha="2024-01-03", total=4, usuario=self.user)
        DetallesVenta.objects.create(
            venta=venta,
            producto=self.final,
            cantidad=2,
            precio_unitario=2,
            lote="FP1",
            lote_final=self.lote_final,
        )
        DevolucionProducto.objects.create(
            fecha="2024-01-04",
            lote="FP1",
            producto=self.final,
            motivo="Defecto",
            cantidad=1,
            responsable=self.user,
        )

    def test_traceability(self):
        resp = self.client.get("/api/trazabilidad/L1/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["lote"], "L1")
        self.assertEqual(len(data["usos"]), 1)
        uso = data["usos"][0]
        self.assertEqual(uso["lote_final"], "FP1")
        self.assertEqual(uso["vendidos"], 2)
        self.assertEqual(uso["devueltos"], 1)
        self.assertEqual(uso["en_stock"], 17)