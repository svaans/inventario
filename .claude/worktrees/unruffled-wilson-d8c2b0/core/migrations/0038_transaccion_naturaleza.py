from django.db import migrations, models


def infer_naturaleza(apps, schema_editor):
    Transaccion = apps.get_model("core", "Transaccion")
    Transaccion.objects.filter(operativo=False, naturaleza="operativo").update(
        naturaleza="estructural"
    )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0037_movimientoinventario_compra_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="transaccion",
            name="naturaleza",
            field=models.CharField(
                choices=[
                    ("operativo", "Operativo"),
                    ("estructural", "Estructural"),
                    ("financiero", "Financiero"),
                ],
                default="operativo",
                max_length=15,
            ),
        ),
        migrations.RunPython(infer_naturaleza, migrations.RunPython.noop),
    ]