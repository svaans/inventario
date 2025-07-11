from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory
from core.models import Categoria, Producto, ComposicionProducto
from core.serializers import VentaCreateSerializer

class IngredientSaleTest(TestCase):
    def setUp(self):
        cat_f = Categoria.objects.create(nombre_categoria="Empanadas")
        cat_i = Categoria.objects.create(nombre_categoria="Ingredientes")
        self.har = Producto.objects.create(codigo="H1", nombre="Harina", tipo="ingredientes", es_ingrediente=True, precio=0, stock_actual=1000, stock_minimo=0, unidad_media="g", categoria=cat_i)
        self.carne = Producto.objects.create(codigo="C1", nombre="Carne", tipo="ingredientes", es_ingrediente=True, precio=0, stock_actual=500, stock_minimo=0, unidad_media="g", categoria=cat_i)
        self.final = Producto.objects.create(codigo="E1", nombre="Empanada", tipo="empanada", es_ingrediente=False, precio=1, stock_actual=10, stock_minimo=0, unidad_media="u", categoria=cat_f)
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
        self.assertEqual(float(self.har.stock_actual), 800)
        self.assertEqual(float(self.carne.stock_actual), 400)