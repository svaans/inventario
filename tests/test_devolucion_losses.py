from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import (
    Categoria,
    Producto,
    Venta,
    DetallesVenta,
    DevolucionProducto,
    LoteProductoFinal,
    UnidadMedida,
)
class DevolucionLossesAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.cat = Categoria.objects.create(nombre_categoria="Empanadas")
        unidad = UnidadMedida.objects.get(abreviatura="u")
        self.prod = Producto.objects.create(
            codigo="L1",
            nombre="Empanada",
            tipo="empanada",
            precio=2,
            costo=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=self.cat,
        )
        self.lote_final = LoteProductoFinal.objects.create(
            codigo="A1",
            producto=self.prod,
            fecha_produccion="2024-01-01",
            cantidad_producida=10,
        )
        venta = Venta.objects.create(fecha="2024-01-01", total=20, usuario=self.user)
        DetallesVenta.objects.create(venta=venta, producto=self.prod, cantidad=10, precio_unitario=2)

    def test_loss_calculation(self):
        DevolucionProducto.objects.create(
            fecha="2024-01-02",
            lote_final=self.lote_final,
            producto=self.prod,
            motivo="Quemada",
            cantidad=2,
            responsable=self.user,
            reembolso=True,
            sustitucion=False,
        )
        resp = self.client.get("/api/devoluciones/losses/?year=2024&month=1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertAlmostEqual(data["total_loss"], 2.0)
        self.assertAlmostEqual(data["impact_percent"], 10.0)