from django.db import migrations
from django.contrib.auth.models import Group, Permission


def create_role_groups(apps, schema_editor):
    ventas, _ = Group.objects.get_or_create(name="ventas")
    produccion, _ = Group.objects.get_or_create(name="produccion")
    finanzas, _ = Group.objects.get_or_create(name="finanzas")

    permissions = Permission.objects.filter(content_type__app_label="core")

    ventas_perms = permissions.filter(codename__startswith="view_venta") |\
        permissions.filter(codename__startswith="add_venta") |\
        permissions.filter(codename__startswith="change_venta") |\
        permissions.filter(codename__startswith="view_detallesventa") |\
        permissions.filter(codename__startswith="add_detallesventa") |\
        permissions.filter(codename__startswith="change_detallesventa")
    ventas.permissions.set(ventas_perms)

    prod_perms = permissions.filter(codename__startswith="view_registroturno") |\
        permissions.filter(codename__startswith="add_registroturno") |\
        permissions.filter(codename__startswith="change_registroturno") |\
        permissions.filter(codename__startswith="view_eventoespecial") |\
        permissions.filter(codename__startswith="add_eventoespecial") |\
        permissions.filter(codename__startswith="change_eventoespecial")
    produccion.permissions.set(prod_perms)

    fin_perms = permissions.filter(codename__startswith="view_transaccion") |\
        permissions.filter(codename__startswith="add_transaccion") |\
        permissions.filter(codename__startswith="change_transaccion") |\
        permissions.filter(codename__startswith="view_balance") |\
        permissions.filter(codename__startswith="add_balance") |\
        permissions.filter(codename__startswith="change_balance")
    finanzas.permissions.set(fin_perms)


def remove_role_groups(apps, schema_editor):
    Group.objects.filter(name__in=["ventas", "produccion", "finanzas"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0023_add_expiration_field"),
    ]

    operations = [
        migrations.RunPython(create_role_groups, remove_role_groups),
    ]