from django.test import TestCase
from rest_framework.test import APIClient, APIRequestFactory
from django.contrib.auth.models import User, Group
from inventario.models import (
    Categoria,
    Producto,
    Venta,
    LoteMateriaPrima,
    LoteProductoFinal,
    UsoLoteMateriaPrima,
)
from inventario.serializers import VentaCreateSerializer


class TraceabilityAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.factory = APIRequestFactory()

        cat = Categoria.objects.create(nombre_categoria="Insumos")
        self.ing = Producto.objects.create(
            codigo="ING1",
            nombre="Harina",
            tipo="ingredientes",
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
            precio=2,
            costo=1,
            stock_actual=15,
            stock_minimo=2,
            unidad_media="u",
            categoria=cat,
        )
        self.lote_ing = LoteMateriaPrima.objects.create(
            codigo="L1",
            producto=self.ing,
            fecha_recepcion="2024-01-01",
            cantidad_inicial=40,
        )
        self.lote_final1 = LoteProductoFinal.objects.create(
            codigo="FP1",
            producto=self.final,
            fecha_produccion="2024-01-02",
            cantidad_producida=5,
        )
        self.lote_final2 = LoteProductoFinal.objects.create(
            codigo="FP2",
            producto=self.final,
            fecha_produccion="2024-01-03",
            cantidad_producida=10,
        )
        UsoLoteMateriaPrima.objects.create(
            lote_materia_prima=self.lote_ing,
            lote_producto_final=self.lote_final1,
            fecha="2024-01-02",
            cantidad=20,
        )
        UsoLoteMateriaPrima.objects.create(
            lote_materia_prima=self.lote_ing,
            lote_producto_final=self.lote_final2,
            fecha="2024-01-03",
            cantidad=20,
        )

        request = self.factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-04",
            "cliente": None,
            "detalles": [
                {"producto": self.final.id, "cantidad": 8, "precio_unitario": 2}
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.final.refresh_from_db()
        self.lote_final1.refresh_from_db()
        self.lote_final2.refresh_from_db()
        self.assertEqual(float(self.lote_final1.cantidad_vendida), 5)
        self.assertEqual(float(self.lote_final2.cantidad_vendida), 3)

        from inventario.models import DevolucionProducto
        DevolucionProducto.objects.create(
            fecha="2024-01-05",
            lote="FP2",
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
        self.assertEqual(len(data["usos"]), 2)
        usos = {u["lote_final"]: u for u in data["usos"]}
        self.assertEqual(usos["FP1"]["vendidos"], 5)
        self.assertEqual(usos["FP1"]["devueltos"], 0)
        self.assertEqual(usos["FP1"]["en_stock"], 0)
        self.assertEqual(usos["FP2"]["vendidos"], 3)
        self.assertEqual(usos["FP2"]["devueltos"], 1)
        self.assertEqual(usos["FP2"]["en_stock"], 6)