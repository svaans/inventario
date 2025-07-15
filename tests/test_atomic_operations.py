from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch
from rest_framework import serializers
from rest_framework.test import APIRequestFactory
from inventario.models import Categoria, Producto, ComposicionProducto, MovimientoInventario
from inventario.serializers import ProductoSerializer, VentaCreateSerializer

class ProductoAtomicityTest(TestCase):
    def setUp(self):
        self.cat = Categoria.objects.create(nombre_categoria="Cat")
        self.ing = Producto.objects.create(
            codigo="T_I1",
            nombre="Ing1",
            tipo="ingredientes",
            es_ingrediente=True,
            precio=0,
            stock_actual=100,
            stock_minimo=0,
            unidad_media="g",
            categoria=self.cat,
        )

    def test_fail_creating_ingredients_rolls_back(self):
        data = {
            "codigo": "T_P1",
            "nombre": "Prod1",
            "descripcion": "",
            "tipo": "empanada",
            "precio": 1,
            "costo": 0,
            "stock_actual": 10,
            "stock_minimo": 1,
            "unidad_media": "u",
            "categoria": self.cat.id,
            "proveedor": None,
            "ingredientes": [
                {"ingrediente": self.ing.id, "cantidad_requerida": 5}
            ],
        }
        serializer = ProductoSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with patch("inventario.models.ComposicionProducto.objects.create", side_effect=Exception("fail")):
            with self.assertRaises(Exception):
                serializer.save()
        self.assertEqual(Producto.objects.filter(codigo="T_P1").count(), 0)
        self.assertEqual(ComposicionProducto.objects.count(), 0)


class VentaAtomicityTest(TestCase):
    def setUp(self):
        cat = Categoria.objects.create(nombre_categoria="Cat")
        self.producto = Producto.objects.create(
            codigo="T_V1",
            nombre="Prod",
            tipo="empanada",
            precio=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media="u",
            categoria=cat,
        )
        self.user = User.objects.create_user(username="u", password="p")

    def test_insufficient_stock_rolls_back(self):
        factory = APIRequestFactory()
        request = factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-01",
            "cliente": None,
            "detalles": [
                {"producto": self.producto.id, "cantidad": 10, "precio_unitario": 1}
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(serializers.ValidationError):
            serializer.save()
        self.assertEqual(Producto.objects.get(id=self.producto.id).stock_actual, 5)
        self.assertEqual(MovimientoInventario.objects.count(), 0)
        from inventario.models import Venta, DetallesVenta
        self.assertEqual(Venta.objects.count(), 0)
        self.assertEqual(DetallesVenta.objects.count(), 0)