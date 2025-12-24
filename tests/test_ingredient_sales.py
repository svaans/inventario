from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory
from rest_framework import serializers as drf_serializers
from inventario.models import Categoria, Producto, ComposicionProducto, UnidadMedida, FamiliaProducto
from inventario.serializers import ProductoSerializer, VentaCreateSerializer

class IngredientSaleTest(TestCase):
    def setUp(self):
        fam_emp = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.EMPANADAS)
        fam_ing = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.INGREDIENTES)
        cat_f, _ = Categoria.objects.get_or_create(nombre_categoria="Empanadas", defaults={"familia": fam_emp})
        cat_i, _ = Categoria.objects.get_or_create(nombre_categoria="Ingredientes", defaults={"familia": fam_ing})
        unidad_g = UnidadMedida.objects.get(abreviatura="g")
        unidad_u = UnidadMedida.objects.get(abreviatura="u")
        self.har = Producto.objects.create(codigo="H1", nombre="Harina", tipo="ingrediente", precio=0, stock_actual=1000, stock_minimo=0, unidad_media=unidad_g, categoria=cat_i)
        self.carne = Producto.objects.create(codigo="C1", nombre="Carne", tipo="ingrediente", precio=0, stock_actual=500, stock_minimo=0, unidad_media=unidad_g, categoria=cat_i)
        self.final = Producto.objects.create(codigo="E1", nombre="Empanada", tipo="empanada", precio=1, stock_actual=10, stock_minimo=0, unidad_media=unidad_u, categoria=cat_f)
        ComposicionProducto.objects.create(producto_final=self.final, ingrediente=self.har, cantidad_requerida=100)
        ComposicionProducto.objects.create(producto_final=self.final, ingrediente=self.carne, cantidad_requerida=50)
        self.user = User.objects.create_user(username="u", password="p")

    def test_sale_deducts_ingredients(self):
        factory = APIRequestFactory()
        request = factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-01",
            "cliente": None,
            "detalles": [
                {"producto": self.final.id, "cantidad": 2, "precio_unitario": 1},
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        venta = serializer.save()
        self.final.refresh_from_db()
        self.har.refresh_from_db()
        self.carne.refresh_from_db()
        self.assertEqual(float(self.final.stock_actual), 8)
        self.assertEqual(float(self.har.stock_actual), 1000)
        self.assertEqual(float(self.carne.stock_actual), 500)

    def test_recipe_update_by_lot(self):
        factory = APIRequestFactory()
        request = factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-01",
            "cliente": None,
            "detalles": [
                {"producto": self.final.id, "cantidad": 1, "precio_unitario": 1},
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        # update recipe for lot L1
        from inventario.serializers import ProductoSerializer

        update_data = {
            "ingredientes": [
                {"ingrediente": self.har.id, "cantidad_requerida": 120, "lote": "L1"},
                {"ingrediente": self.carne.id, "cantidad_requerida": 60, "lote": "L1"},
            ]
        }
        p_ser = ProductoSerializer(instance=self.final, data=update_data, partial=True)
        self.assertTrue(p_ser.is_valid(), p_ser.errors)
        p_ser.save()

        data2 = {
            "fecha": "2024-01-02",
            "cliente": None,
            "detalles": [
                {"producto": self.final.id, "cantidad": 1, "precio_unitario": 1, "lote": "L1"},
            ],
        }
        serializer2 = VentaCreateSerializer(data=data2, context={"request": request})
        self.assertTrue(serializer2.is_valid(), serializer2.errors)
        serializer2.save()

        self.har.refresh_from_db()
        self.carne.refresh_from_db()
        # Ingredientes no se descuentan en ventas
        self.assertEqual(float(self.har.stock_actual), 1000)
        self.assertEqual(float(self.carne.stock_actual), 500)

    def test_production_consumes_ingredients_and_limits_stock(self):
        factory = APIRequestFactory()
        request = factory.patch("/productos/")
        request.user = self.user

        self.har.stock_actual = 2000
        self.har.save()
        self.carne.stock_actual = 1000
        self.carne.save()

        update_data = {"stock_actual": 15}
        serializer = ProductoSerializer(
            instance=self.final,
            data=update_data,
            partial=True,
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.final.refresh_from_db()
        self.har.refresh_from_db()
        self.carne.refresh_from_db()

        self.assertEqual(float(self.final.stock_actual), 15.0)
        self.assertEqual(float(self.har.stock_actual), 1500.0)
        self.assertEqual(float(self.carne.stock_actual), 750.0)

        invalid_update = {"stock_actual": 25}
        serializer_invalid = ProductoSerializer(
            instance=self.final,
            data=invalid_update,
            partial=True,
            context={"request": request},
        )
        self.assertFalse(serializer_invalid.is_valid())
        self.assertIn("stock_actual", serializer_invalid.errors)

    def test_maximum_production_clears_ingredients(self):
        factory = APIRequestFactory()
        request = factory.patch("/productos/")
        request.user = self.user

        # Ajustar existencias para producir exactamente 14 unidades (ingredientes en cero)
        self.har.stock_actual = 1400
        self.har.save()
        self.carne.stock_actual = 700
        self.carne.save()
        self.final.stock_actual = 0
        self.final.save()

        update_data = {"stock_actual": 14}
        serializer = ProductoSerializer(
            instance=self.final,
            data=update_data,
            partial=True,
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.har.refresh_from_db()
        self.carne.refresh_from_db()

        self.assertEqual(float(self.har.stock_actual), 0.0)
        self.assertEqual(float(self.carne.stock_actual), 0.0)

    def test_cannot_sell_ingredient_products(self):
        factory = APIRequestFactory()
        request = factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-03",
            "cliente": None,
            "detalles": [
                {"producto": self.har.id, "cantidad": 1, "precio_unitario": 1},
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(drf_serializers.ValidationError):
            serializer.save()
        self.har.refresh_from_db()
        self.assertEqual(float(self.har.stock_actual), 1000.0)