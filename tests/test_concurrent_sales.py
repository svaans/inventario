from django.test import TransactionTestCase
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory
from django.db import close_old_connections
from rest_framework import serializers
import threading
from core.models import Categoria, Producto
from core.serializers import VentaCreateSerializer

class ConcurrentSaleTest(TransactionTestCase):
    def setUp(self):
        cat = Categoria.objects.create(nombre_categoria="Cat")
        self.producto = Producto.objects.create(
            codigo="CS1",
            nombre="Prod",
            tipo="empanada",
            precio=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media="u",
            categoria=cat,
        )
        self.user = User.objects.create_user(username="u", password="p")

    def _make_sale(self, cantidad, results, key):
        close_old_connections()
        factory = APIRequestFactory()
        request = factory.post("/ventas/")
        request.user = self.user
        data = {
            "fecha": "2024-01-01",
            "cliente": None,
            "detalles": [
                {"producto": self.producto.id, "cantidad": cantidad, "precio_unitario": 1}
            ],
        }
        serializer = VentaCreateSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
            results[key] = "ok"
        except Exception as e:
            results[key] = e

    def test_concurrent_sales(self):
        results = {}
        t1 = threading.Thread(target=self._make_sale, args=(4, results, "t1"))
        t2 = threading.Thread(target=self._make_sale, args=(3, results, "t2"))
        t1.start(); t2.start(); t1.join(); t2.join()
        self.producto.refresh_from_db()
        self.assertEqual(float(self.producto.stock_actual), 1)
        self.assertEqual(results["t1"], "ok")
        self.assertIsInstance(results["t2"], serializers.ValidationError)