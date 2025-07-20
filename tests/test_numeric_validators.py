from django.core.exceptions import ValidationError
from django.test import TestCase
from inventario.models import (
    Categoria,
    UnidadMedida,
    Proveedor,
    Producto,
    Compra,
    DetalleCompra,
    MovimientoInventario,
)
from core.models import RegistroTurno


class NumericValidatorsTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre_categoria="Val")
        self.unidad = UnidadMedida.objects.get(abreviatura="u")
        self.proveedor = Proveedor.objects.create(
            nombre="Prov", contacto="c", direccion="d"
        )
        self.producto = Producto.objects.create(
            codigo="VAL1",
            nombre="Val",
            tipo="empanada",
            precio=1,
            stock_actual=1,
            stock_minimo=0,
            unidad_media=self.unidad,
            categoria=self.categoria,
            proveedor=self.proveedor,
        )
        self.compra = Compra.objects.create(
            proveedor=self.proveedor,
            fecha="2024-01-01",
            total=1,
        )

    def test_producto_negative_stock(self):
        self.producto.stock_actual = -1
        with self.assertRaises(ValidationError):
            self.producto.full_clean()

    def test_detalle_compra_negative_quantity(self):
        detalle = DetalleCompra(
            compra=self.compra,
            producto=self.producto,
            cantidad=-1,
            precio_unitario=1,
        )
        with self.assertRaises(ValidationError):
            detalle.full_clean()

    def test_movimiento_inventario_negative_quantity(self):
        mov = MovimientoInventario(
            producto=self.producto,
            tipo="entrada",
            cantidad=-1,
            motivo="t",
        )
        with self.assertRaises(ValidationError):
            mov.full_clean()

    def test_registro_turno_negative_sales(self):
        turno = RegistroTurno(
            fecha="2024-01-01",
            turno="manana",
            ventas=-1,
            horas_trabajadas=0,
        )
        with self.assertRaises(ValidationError):
            turno.full_clean()