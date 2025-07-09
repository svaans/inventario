from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User, Group
from django.utils import timezone

from .models import (
    Producto,
    Categoria,
    Proveedor,
    Compra,
    DetalleCompra,
    Cliente,
    Venta,
    DetallesVenta,
    MovimientoInventario,
)


class ProductoTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre_categoria="General")
        self.proveedor = Proveedor.objects.create(
            nombre="Prov", contacto="c", direccion="d"
        )
        self.cliente = Cliente.objects.create(nombre="Cli", contacto="c")
        self.user = User.objects.create_user(
            username="user", email="user@test.com", password="pass"
        )
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user.groups.add(admin_group)

    def test_codigo_unico(self):
        Producto.objects.create(
            codigo="P1",
            nombre="Prod1",
            tipo="empanada",
            precio=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media="unidad",
            categoria=self.categoria,
        )
        with self.assertRaises(Exception):
            Producto.objects.create(
                codigo="P1",
                nombre="Prod2",
                tipo="empanada",
                precio=1,
                stock_actual=5,
                stock_minimo=1,
                unidad_media="unidad",
                categoria=self.categoria,
            )

    def test_stock_actualizacion_compra_venta(self):
        producto = Producto.objects.create(
            codigo="P2",
            nombre="Prod2",
            tipo="empanada",
            precio=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media="unidad",
            categoria=self.categoria,
        )

        compra = Compra.objects.create(
            proveedor=self.proveedor, fecha=timezone.now().date(), total=0
        )
        DetalleCompra.objects.create(
            compra=compra, producto=producto, cantidad=5, precio_unitario=1
        )
        producto.stock_actual += 5
        producto.save()
        MovimientoInventario.objects.create(
            producto=producto, tipo="entrada", cantidad=5, motivo="Compra"
        )
        producto.refresh_from_db()
        self.assertEqual(producto.stock_actual, 15)

        venta = Venta.objects.create(
            fecha=timezone.now().date(), total=0, usuario=self.user, cliente=self.cliente
        )
        DetallesVenta.objects.create(
            venta=venta, producto=producto, cantidad=3, precio_unitario=1
        )
        producto.stock_actual -= 3
        producto.save()
        MovimientoInventario.objects.create(
            producto=producto, tipo="salida", cantidad=3, motivo="Venta"
        )
        producto.refresh_from_db()
        self.assertEqual(producto.stock_actual, 12)

    def test_reporte_inventario_view(self):
        Producto.objects.create(
            codigo="P3",
            nombre="Prod3",
            tipo="empanada",
            precio=1,
            stock_actual=5,
            stock_minimo=1,
            unidad_media="unidad",
            categoria=self.categoria,
        )

        self.client.force_login(self.user)
        response = self.client.get(reverse("reporte_inventario"))
        self.assertEqual(response.status_code, 200)

        export_resp = self.client.get(reverse("exportar_inventario_excel"))
        self.assertEqual(export_resp.status_code, 200)
        self.assertEqual(
            export_resp["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    def test_api_create_product_with_category(self):
        url = reverse("productos-list")
        data = {
            "codigo": "P100",
            "nombre": "ProdX",
            "tipo": "empanada",
            "precio": 2,
            "stock_actual": 5,
            "stock_minimo": 1,
            "unidad_media": "unidad",
            "categoria": self.categoria.id,
        }
        self.client.force_login(self.user)
        response = self.client.post(url, data, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        producto = Producto.objects.get(codigo="P100")
        self.assertEqual(producto.categoria, self.categoria)
        self.assertEqual(response.json()["categoria_nombre"], self.categoria.nombre_categoria)
    def test_api_create_product_assigns_category(self):
        url = reverse("productos-list")
        payload = {
            "codigo": "PX1",
            "nombre": "ProdY",
            "tipo": "empanada",
            "precio": 1,
            "stock_actual": 10,
            "stock_minimo": 2,
            "unidad_media": "unidad",
            "categoria": self.categoria.id,
        }
        self.client.force_login(self.user)
        resp = self.client.post(url, payload, content_type="application/json")
        self.assertEqual(resp.status_code, 201)
        producto = Producto.objects.get(codigo="PX1")
        self.assertEqual(producto.categoria_id, self.categoria.id)
        self.assertEqual(resp.json()["categoria_nombre"], self.categoria.nombre_categoria)