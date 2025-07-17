import pytest
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from inventario.models import Categoria, Producto, Proveedor, Cliente, Venta, DetallesVenta, ComposicionProducto

@pytest.mark.django_db
def test_producto_list_queries(django_assert_num_queries):
    admin_group, _ = Group.objects.get_or_create(name="admin")
    user = User.objects.create_user(username="admin", password="pass")
    user.groups.add(admin_group)
    client = APIClient()
    client.force_authenticate(user=user)

    cat = Categoria.objects.create(nombre_categoria="Cat")
    prov = Proveedor.objects.create(nombre="Prov", contacto="1", direccion="d")
    ing = Producto.objects.create(
        codigo="ING",
        nombre="Ing",
        tipo="ingredientes",
        es_ingrediente=True,
        precio=1,
        costo=1,
        stock_actual=1,
        stock_minimo=1,
        unidad_media="u",
        categoria=cat,
        proveedor=prov,
    )
    for i in range(3):
        prod = Producto.objects.create(
            codigo=f"P{i}",
            nombre=f"Prod{i}",
            tipo="empanada",
            precio=1,
            costo=1,
            stock_actual=1,
            stock_minimo=1,
            unidad_media="u",
            categoria=cat,
            proveedor=prov,
        )
        ComposicionProducto.objects.create(
            producto_final=prod,
            ingrediente=ing,
            cantidad_requerida=1,
        )

    with django_assert_num_queries(4):
        response = client.get("/api/productos/")
        assert response.status_code == 200

@pytest.mark.django_db
def test_venta_list_queries(django_assert_num_queries):
    ventas_group, _ = Group.objects.get_or_create(name="ventas")
    user = User.objects.create_user(username="vendedor", password="pass")
    user.groups.add(ventas_group)
    client = APIClient()
    client.force_authenticate(user=user)

    cat = Categoria.objects.create(nombre_categoria="Cat")
    prov = Proveedor.objects.create(nombre="Prov", contacto="1", direccion="d")
    prod = Producto.objects.create(
        codigo="P1",
        nombre="Prod1",
        tipo="empanada",
        precio=1,
        costo=1,
        stock_actual=1,
        stock_minimo=1,
        unidad_media="u",
        categoria=cat,
        proveedor=prov,
    )
    cliente = Cliente.objects.create(nombre="Cli", contacto="c")
    for _ in range(2):
        venta = Venta.objects.create(fecha="2024-01-01", total=1, usuario=user, cliente=cliente)
        DetallesVenta.objects.create(venta=venta, producto=prod, cantidad=1, precio_unitario=1)

    with django_assert_num_queries(3):
        response = client.get("/api/ventas/")
        assert response.status_code == 200