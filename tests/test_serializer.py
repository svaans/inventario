from django.test import TestCase
from django.contrib.auth.models import User
from decimal import Decimal
from core.models import (
    Producto,
    Categoria,
    Proveedor,
    Compra,
    DetalleCompra,
    Venta,
    DetallesVenta,
    Cliente,
    ComposicionProducto,
)
from core.serializers import ProductoSerializer

class ProductoSerializerTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre_categoria="Prueba")
        self.proveedor = Proveedor.objects.create(nombre="Proveedor X", contacto="123", direccion="Dirección")

    def test_producto_con_categoria_valida(self):
        data = {
            "codigo": "T123",
            "nombre": "Test Producto",
            "descripcion": "Descripción",
            "tipo": "empanada",
            "precio": "12.50",
            "costo": "5.00",
            "stock_actual": "20.00",
            "stock_minimo": "5.00",
            "unidad_media": "unidad",
            "categoria": self.categoria.id,
            "proveedor": self.proveedor.id
        }
        serializer = ProductoSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_decimal_rounding(self):
        producto = Producto.objects.create(
            codigo="R1",
            nombre="RoundProd",
            tipo="empanada",
            precio=Decimal("12.345"),
            costo=Decimal("5.678"),
            stock_actual=Decimal("10.555"),
            stock_minimo=Decimal("1.234"),
            unidad_media="u",
            categoria=self.categoria,
            proveedor=self.proveedor,
        )
        producto.refresh_from_db()
        self.assertEqual(producto.precio, Decimal("12.35"))
        self.assertEqual(producto.costo, Decimal("5.68"))
        self.assertEqual(producto.stock_actual, Decimal("10.56"))
        self.assertEqual(producto.stock_minimo, Decimal("1.23"))

        compra = Compra.objects.create(
            proveedor=self.proveedor,
            fecha="2024-01-01",
            total=Decimal("20.555"),
        )
        compra.refresh_from_db()
        self.assertEqual(compra.total, Decimal("20.56"))

        detalle_compra = DetalleCompra.objects.create(
            compra=compra,
            producto=producto,
            cantidad=Decimal("1.234"),
            precio_unitario=Decimal("2.345"),
        )
        detalle_compra.refresh_from_db()
        self.assertEqual(detalle_compra.cantidad, Decimal("1.23"))
        self.assertEqual(detalle_compra.precio_unitario, Decimal("2.35"))

        cliente = Cliente.objects.create(nombre="C", contacto="1")
        user = User.objects.create_user(username="u1", password="p")
        venta = Venta.objects.create(
            fecha="2024-01-02",
            total=Decimal("5.555"),
            usuario=user,
            cliente=cliente,
        )
        venta.refresh_from_db()
        self.assertEqual(venta.total, Decimal("5.56"))

        detalle_venta = DetallesVenta.objects.create(
            venta=venta,
            producto=producto,
            cantidad=Decimal("2.345"),
            precio_unitario=Decimal("3.456"),
        )
        detalle_venta.refresh_from_db()
        self.assertEqual(detalle_venta.cantidad, Decimal("2.35"))
        self.assertEqual(detalle_venta.precio_unitario, Decimal("3.46"))

class ComposicionTest(TestCase):
    def setUp(self):
        cat_final = Categoria.objects.create(nombre_categoria="Empanadas")
        cat_ing = Categoria.objects.create(nombre_categoria="Ingredientes")
        self.har = Producto.objects.create(
            codigo="I1",
            nombre="Harina",
            tipo="ingredientes",
            es_ingrediente=True,
            precio=0,
            stock_actual=1000,
            stock_minimo=0,
            unidad_media="g",
            categoria=cat_ing,
        )
        self.carne = Producto.objects.create(
            codigo="I2",
            nombre="Carne",
            tipo="ingredientes",
            es_ingrediente=True,
            precio=0,
            stock_actual=500,
            stock_minimo=0,
            unidad_media="g",
            categoria=cat_ing,
        )
        self.final = Producto.objects.create(
            codigo="F1",
            nombre="Empanada Carne",
            tipo="empanada",
            es_ingrediente=False,
            precio=1,
            stock_actual=10,
            stock_minimo=0,
            unidad_media="unidad",
            categoria=cat_final,
        )
        ComposicionProducto.objects.create(
            producto_final=self.final,
            ingrediente=self.har,
            cantidad_requerida=100,
        )
        ComposicionProducto.objects.create(
            producto_final=self.final,
            ingrediente=self.carne,
            cantidad_requerida=50,
        )

    def test_unidades_posibles(self):
        data = ProductoSerializer(self.final).data
        self.assertEqual(data["unidades_posibles"], 10)

