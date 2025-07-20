import datetime
from django.test import TestCase
from django.contrib.auth.models import User, Group
from inventario.models import Categoria, Producto, LoteMateriaPrima, UnidadMedida
from inventario.utils import consumir_ingrediente_fifo, lotes_por_vencer

class FIFOExpirationTest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        cat = Categoria.objects.create(nombre_categoria="Insumos")
        unidad = UnidadMedida.objects.get(abreviatura="kg")
        self.ing = Producto.objects.create(
            codigo="ING1",
            nombre="Harina",
            tipo="ingredientes",
            precio=0,
            costo=0,
            stock_actual=0,
            stock_minimo=0,
            unidad_media=unidad,
            categoria=cat,
        )
        LoteMateriaPrima.objects.create(
            codigo="L1",
            producto=self.ing,
            fecha_recepcion=datetime.date.today() - datetime.timedelta(days=5),
            fecha_vencimiento=datetime.date.today() + datetime.timedelta(days=10),
            cantidad_inicial=5,
        )
        LoteMateriaPrima.objects.create(
            codigo="L2",
            producto=self.ing,
            fecha_recepcion=datetime.date.today() - datetime.timedelta(days=2),
            fecha_vencimiento=datetime.date.today() + datetime.timedelta(days=12),
            cantidad_inicial=5,
        )

    def test_fifo_consumption(self):
        consumir_ingrediente_fifo(self.ing, 7)
        l1 = LoteMateriaPrima.objects.get(codigo="L1")
        l2 = LoteMateriaPrima.objects.get(codigo="L2")
        self.assertEqual(float(l1.cantidad_usada), 5)
        self.assertEqual(float(l2.cantidad_usada), 2)

    def test_alerts(self):
        lote = LoteMateriaPrima.objects.create(
            codigo="L3",
            producto=self.ing,
            fecha_recepcion=datetime.date.today(),
            fecha_vencimiento=datetime.date.today() + datetime.timedelta(days=3),
            cantidad_inicial=1,
        )
        alertas = lotes_por_vencer(5)
        self.assertIn(lote, alertas)