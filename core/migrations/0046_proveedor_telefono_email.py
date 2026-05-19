from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0045_balance_utilidad_allow_negative"),
    ]

    operations = [
        migrations.AddField(
            model_name="proveedor",
            name="telefono",
            field=models.CharField(max_length=50, blank=True, default=""),
        ),
        migrations.AddField(
            model_name="proveedor",
            name="email",
            field=models.EmailField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="proveedor",
            name="contacto",
            field=models.CharField(max_length=100, blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="proveedor",
            name="direccion",
            field=models.CharField(max_length=200, blank=True, default=""),
        ),
    ]
