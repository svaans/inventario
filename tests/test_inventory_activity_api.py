from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, MovimientoInventario, UnidadMedida, FamiliaProducto


class InventoryActivityAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        user = User.objects.create_user(username="emp", password="pass")
        empleado_group, _ = Group.objects.get_or_create(name="empleado")
        user.groups.add(empleado_group)
        self.client.force_authenticate(user=user)
        fam_otro = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.OTROS)
        cat = Categoria.objects.create(nombre_categoria="General", familia=fam_otro)
        unidad = UnidadMedida.objects.get(abreviatura="u")
        prod = Producto.objects.create(
            codigo="P1",
            nombre="Producto",
            tipo="producto_final",
            precio=1,
            costo=0.5,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        MovimientoInventario.objects.create(
            producto=prod,
            tipo="entrada",
            cantidad=5,
            motivo="test",
        )

    def test_endpoint_returns_hourly_data(self):
        resp = self.client.get("/api/inventory-activity/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 13)
        self.assertIn("hour", data[0])
        self.assertIn("value", data[0])