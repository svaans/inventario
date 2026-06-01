from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, Cliente, Venta, DetallesVenta, UnidadMedida, FamiliaProducto
from finanzas.models import Transaccion
from datetime import date

class BusinessEvolutionAPITest(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="admin", password="pass")
        self.user.groups.add(admin_group)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        fam_emp = FamiliaProducto.objects.get(clave=FamiliaProducto.Clave.EMPANADAS)
        cat = Categoria.objects.create(nombre_categoria="General", familia=fam_emp)
        unidad = UnidadMedida.objects.get(abreviatura="u")
        prod = Producto.objects.create(
            codigo="P1",
            nombre="Prod",
            tipo="empanada",
            precio=2,
            costo=1,
            stock_actual=10,
            stock_minimo=1,
            unidad_media=unidad,
            categoria=cat,
        )
        cli1 = Cliente.objects.create(nombre="c1", contacto="1")
        cli2 = Cliente.objects.create(nombre="c2", contacto="2")
        # ventas y transacciones para tres meses
        for i, cli in enumerate([cli1, cli2], start=1):
            d = date(2024, i, 1)
            venta = Venta.objects.create(fecha=d, total=10 * i, usuario=self.user, cliente=cli)
            DetallesVenta.objects.create(venta=venta, producto=prod, cantidad=1, precio_unitario=prod.precio)
            Transaccion.objects.create(fecha=d, monto=10 * i, tipo="ingreso", categoria="mostrador", responsable=self.user)
            Transaccion.objects.create(fecha=d, monto=5, tipo="egreso", categoria="sueldos", responsable=self.user)

    def test_returns_projection(self):
        resp = self.client.get("/api/business-evolution/?period=month")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # 2 meses reales + 3er con projection
        self.assertTrue(any(item.get("projected") for item in data))