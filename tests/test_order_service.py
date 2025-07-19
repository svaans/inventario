import os
from django.test import TestCase
from unittest.mock import patch
from inventario.models import Categoria, Producto, Proveedor
from core.models import Compra, DetalleCompra
from finanzas.services import enviar_orden_compra


class PurchaseOrderServiceTest(TestCase):
    def setUp(self):
        cat = Categoria.objects.create(nombre_categoria="Insumos")
        self.prov = Proveedor.objects.create(nombre="Prov", contacto="c", direccion="d")
        self.prod = Producto.objects.create(
            codigo="I1",
            nombre="Ing",
            tipo="ingredientes",
            precio=1,
            costo=1,
            stock_actual=0,
            stock_minimo=0,
            unidad_media="kg",
            categoria=cat,
            proveedor=self.prov,
        )
        from datetime import date
        self.compra = Compra.objects.create(proveedor=self.prov, fecha=date(2024, 1, 1), total=5)
        DetalleCompra.objects.create(compra=self.compra, producto=self.prod, cantidad=5, precio_unitario=1)

    @patch("finanzas.services.requests.post")
    def test_envio_por_api(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"ok": True}
        with patch.dict(os.environ, {"SUPPLIER_API_URL": "http://api.test/orders", "SUPPLIER_API_TOKEN": "t"}):
            resp = enviar_orden_compra(self.compra)
        mock_post.assert_called_once()
        self.assertEqual(resp, {"ok": True})

    @patch("finanzas.services.EmailMessage.send")
    def test_envio_por_correo(self, mock_send):
        with patch.dict(os.environ, {"SUPPLIER_EMAIL": "prov@test.com"}, clear=True):
            enviar_orden_compra(self.compra)
        mock_send.assert_called_once()