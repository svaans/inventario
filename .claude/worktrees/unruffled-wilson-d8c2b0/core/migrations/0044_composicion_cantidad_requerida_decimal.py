from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0043_facturaventa"),
    ]

    operations = [
        migrations.AlterField(
            model_name="composicionproducto",
            name="cantidad_requerida",
            field=models.DecimalField(
                decimal_places=4,
                help_text="Cantidad requerida del ingrediente (en gramos, litros, etc.)",
                max_digits=10,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
    ]
