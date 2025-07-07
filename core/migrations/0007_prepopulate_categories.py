from django.db import migrations


def create_categories(apps, schema_editor):
    Categoria = apps.get_model('core', 'Categoria')
    predefined = [
        'Empanadas',
        'Bebidas',
        'Ingredientes',
        'Otros alimentos preparados',
    ]
    for name in predefined:
        Categoria.objects.get_or_create(nombre_categoria=name)


def remove_categories(apps, schema_editor):
    Categoria = apps.get_model('core', 'Categoria')
    Categoria.objects.filter(nombre_categoria__in=[
        'Empanadas',
        'Bebidas',
        'Ingredientes',
        'Otros alimentos preparados',
    ]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0006_producto_costo_producto_descripcion_and_more'),
    ]

    operations = [
        migrations.RunPython(create_categories, remove_categories),
    ]