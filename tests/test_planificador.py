from datetime import date

from django.test import TestCase
from django.contrib.auth.models import User

from inventario.models import (
    Categoria,
    Producto,
    Venta,
    DetallesVenta,
    ComposicionProducto,
)
from produccion.models import EventoEspecial, CapacidadTurno, PlanProduccion
from produccion.planificador import (
    sugerencia_diaria,
    ajustar_plan,
    registrar_real,
)


class PlanificadorTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="u", password="p")
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
        ing = Producto.objects.create(
            codigo="I1",
            nombre="Harina",
            tipo="ingredientes",
            es_ingrediente=True,
            precio=0,
            costo=0,
            stock_actual=20,
            stock_minimo=1,
            unidad_media="kg",
            categoria=cat,
        )
        ComposicionProducto.objects.create(
            producto_final=self.emp,
            ingrediente=ing,
            cantidad_requerida=1,
        )
        for d in [date(2024, 1, 1), date(2024, 1, 8), date(2024, 1, 15), date(2024, 1, 22)]:
            venta = Venta.objects.create(fecha=d, total=20, usuario=self.user)
            DetallesVenta.objects.create(venta=venta, producto=self.emp, cantidad=10, precio_unitario=2)
        EventoEspecial.objects.create(fecha=date(2024, 1, 29), nombre="Fiesta", factor_demanda=1.5)
        CapacidadTurno.objects.create(fecha=date(2024, 1, 29), turno="manana", capacidad=15)

    def test_registro_y_ajuste(self):
        plan = sugerencia_diaria(date(2024, 1, 29))
        self.assertEqual(plan["fecha"], "2024-01-29")
        registro = PlanProduccion.objects.get(fecha=date(2024, 1, 29), producto=self.emp)
        self.assertEqual(registro.sugerido, 15)
        ajustar_plan(date(2024, 1, 29), {self.emp.id: 20})
        registro.refresh_from_db()
        self.assertEqual(registro.ajustado, 20)
        registrar_real(date(2024, 1, 29), {self.emp.id: 18})
        registro.refresh_from_db()
        self.assertEqual(registro.real, 18)