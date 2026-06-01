import django.db.models.deletion
from django.db import migrations, models
from django.db.models.functions import Lower


def create_familias(apps, schema_editor):
    Familia = apps.get_model("core", "FamiliaProducto")
    defaults = [
        ("bebidas", "Bebidas"),
        ("empanadas", "Empanadas"),
        ("ingredientes", "Ingredientes"),
        ("otros", "Otros"),
    ]
    for clave, nombre in defaults:
        Familia.objects.update_or_create(clave=clave, defaults={"nombre": nombre})


def assign_familias(apps, schema_editor):
    Familia = apps.get_model("core", "FamiliaProducto")
    Categoria = apps.get_model("core", "Categoria")
    Producto = apps.get_model("core", "Producto")

    def infer_family(nombre: str) -> str:
        n = (nombre or "").lower()
        if "bebida" in n:
            return "bebidas"
        if "empanad" in n:
            return "empanadas"
        if "ingred" in n or "insumo" in n:
            return "ingredientes"
        return "otros"

    familias = {f.clave: f for f in Familia.objects.all()}

    for categoria in Categoria.objects.all():
        clave = infer_family(categoria.nombre_categoria)
        familia = familias.get(clave)
        if familia:
            categoria.familia_id = familia.id
            categoria.save(update_fields=["familia"])

    for producto in Producto.objects.select_related("categoria"):
        update_fields = []
        if producto.tipo == "ingredientes":
            producto.tipo = "ingrediente"
            update_fields.append("tipo")
        if not producto.familia_id:
            familia_id = None
            if producto.categoria_id:
                familia_id = producto.categoria.familia_id
                if not familia_id:
                    clave = infer_family(producto.categoria.nombre_categoria)
                    familia_id = familias.get(clave).id if familias.get(clave) else None
            if not familia_id:
                clave = infer_family(producto.nombre)
                familia_id = familias.get(clave).id if familias.get(clave) else None
            if familia_id:
                producto.familia_id = familia_id
                update_fields.append("familia")
        if update_fields:
            producto.save(update_fields=update_fields)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0035_devolucionproducto_clasificacion_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="FamiliaProducto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "clave",
                    models.CharField(
                        choices=[
                            ("bebidas", "Bebidas"),
                            ("empanadas", "Empanadas"),
                            ("ingredientes", "Ingredientes"),
                            ("otros", "Otros"),
                        ],
                        max_length=20,
                        unique=True,
                    ),
                ),
                ("nombre", models.CharField(max_length=50, unique=True)),
            ],
            options={
                "verbose_name": "Familia de producto",
                "verbose_name_plural": "Familias de producto",
            },
        ),
        migrations.AddField(
            model_name="categoria",
            name="familia",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name="categorias", to="core.familiaproducto"),
        ),
        migrations.AddField(
            model_name="producto",
            name="familia",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name="productos", to="core.familiaproducto"),
        ),
        migrations.AddConstraint(
            model_name="familiaproducto",
            constraint=models.UniqueConstraint(Lower("nombre"), name="familia_nombre_ci_unique"),
        ),
        migrations.AddConstraint(
            model_name="categoria",
            constraint=models.UniqueConstraint(Lower("nombre_categoria"), name="categoria_nombre_ci_unique"),
        ),
        migrations.AddConstraint(
            model_name="producto",
            constraint=models.UniqueConstraint(Lower("nombre"), name="producto_nombre_ci_unique"),
        ),
        migrations.RunPython(create_familias, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(assign_familias, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name="categoria",
            name="familia",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="categorias", to="core.familiaproducto"),
        ),
        migrations.AlterField(
            model_name="producto",
            name="familia",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="productos", to="core.familiaproducto"),
        ),
        migrations.AlterField(
            model_name="producto",
            name="tipo",
            field=models.CharField(choices=[("empanada", "Empanada"), ("ingrediente", "Ingrediente"), ("producto_final", "Producto final"), ("bebida", "Bebida")], max_length=20),
        ),
    ]