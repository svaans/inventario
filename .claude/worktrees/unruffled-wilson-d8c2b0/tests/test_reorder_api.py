from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, Proveedor, Compra, DetalleCompra, UnidadMedida, FamiliaProducto
class ReorderAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        fam_ing = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.INGREDIENTES)
        cat = Categoria.objects.create(nombre_categoria="Insumos", familia=fam_ing)
        self.prov = Proveedor.objects.create(nombre="Prov", contacto="c", direccion="d")
        unidad = UnidadMedida.objects.get(abreviatura="kg")
        self.prod = Producto.objects.create(
            codigo="I1",
            nombre="Harina",
            tipo="ingrediente",
            precio=0,
            costo=1,
            stock_actual=0,
            stock_minimo=5,
            unidad_media=unidad,
            categoria=cat,
            proveedor=self.prov,
        )

    def test_suggest_and_confirm_reorder(self):
        resp = self.client.get("/api/reorder/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["producto"], self.prod.id)

        resp2 = self.client.post("/api/reorder/", {"horizon": 7}, format="json")
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(Compra.objects.count(), 1)
        self.assertEqual(DetalleCompra.objects.count(), 1)
        compra = Compra.objects.first()
        self.assertEqual(float(compra.total), 5.0)