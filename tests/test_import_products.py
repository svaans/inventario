from django.contrib.auth.models import Group, User
from django.test import TestCase
from django.urls import reverse
from django.conf import settings

from inventario.models import Categoria, FamiliaProducto, Producto, UnidadMedida


class ImportacionProductosTests(TestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(username="importer", password="pass")
        self.user.groups.add(admin_group)
        self.unidad = UnidadMedida.objects.get(abreviatura="u")

    def test_importacion_crea_categoria_por_nombre(self):
        self.client.force_login(self.user)
        session = self.client.session
        session["vista_previa_productos"] = [
            {
                "estado": "nuevo",
                "categoria": "Bebidas",
                "codigo": "IMP200",
                "nombre": "Agua",
                "tipo": "bebida",
                "precio": 1,
                "stock_actual": 5,
                "stock_minimo": 1,
                "unidad_media_id": self.unidad.id,
                "fila_excel": 2,
            }
        ]
        session.save()

        response = self.client.post(reverse("cargar_productos"), {"confirmar": "1"})
        self.assertEqual(response.status_code, 302)

        producto = Producto.objects.get(codigo="IMP200")
        self.assertEqual(producto.categoria.nombre_categoria, "Bebidas")
        self.assertEqual(producto.categoria.familia.clave, FamiliaProducto.Clave.BEBIDAS)

    def test_importacion_usa_categoria_por_defecto(self):
        self.client.force_login(self.user)
        session = self.client.session
        session["vista_previa_productos"] = [
            {
                "estado": "nuevo",
                "categoria": "",
                "codigo": "IMP201",
                "nombre": "Producto sin categoria",
                "tipo": "producto_final",
                "precio": 10,
                "stock_actual": 2,
                "stock_minimo": 1,
                "unidad_media_id": self.unidad.id,
                "fila_excel": 3,
            }
        ]
        session.save()

        response = self.client.post(reverse("cargar_productos"), {"confirmar": "1"})
        self.assertEqual(response.status_code, 302)

        producto = Producto.objects.get(codigo="IMP201")
        self.assertEqual(producto.categoria.nombre_categoria, settings.IMPORT_DEFAULT_CATEGORY_NAME)
        self.assertEqual(producto.categoria.familia.clave, FamiliaProducto.Clave.OTROS)
        self.assertTrue(Categoria.objects.filter(nombre_categoria=settings.IMPORT_DEFAULT_CATEGORY_NAME).exists())