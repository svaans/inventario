from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch
from rest_framework import serializers
from rest_framework.test import APIRequestFactory
from inventario.models import (
    Categoria,
    Producto,
    ComposicionProducto,
    MovimientoInventario,
    UnidadMedida,
    FamiliaProducto,
)
from inventario.serializers import ProductoSerializer, VentaCreateSerializer

class ProductoAtomicityTest(TestCase):
    def setUp(self):
        fam_ing = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.INGREDIENTES)
        fam_emp = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.EMPANADAS)
        self.cat_ing = Categoria.objects.create(nombre_categoria="Cat", familia=fam_ing)
        self.cat_emp = Categoria.objects.create(nombre_categoria="Cat empanada", familia=fam_emp)
        unidad_g = UnidadMedida.objects.get(abreviatura="g")
        self.ing = Producto.objects.create(
            codigo="T_I1",
            nombre="Ing1",
            tipo="ingrediente",
            precio=0,
            stock_actual=100,
            stock_minimo=0,
            unidad_media=unidad_g,
            categoria=self.cat_ing,
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
            "unidad_media": UnidadMedida.objects.get(abreviatura="u").id,
            "categoria": self.cat_emp.id,
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
        fam_emp = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.EMPANADAS)
        cat = Categoria.objects.create(nombre_categoria="Cat", familia=fam_emp)
        self.producto = Producto.objects.create(
            codigo="T_V1",
            nombre="Prod",
            tipo="empanada",
            precio=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media=UnidadMedida.objects.get(abreviatura="u"),
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