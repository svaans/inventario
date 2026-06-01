from django.db import migrations, models


class Migration(migrations.Migration):
    """Remove MinValueValidator(0) from utilidad fields that can legitimately be negative."""

    dependencies = [
        ("core", "0044_composicion_cantidad_requerida_decimal"),
    ]

    operations = [
        migrations.AlterField(
            model_name="balance",
            name="utilidad",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AlterField(
            model_name="balance",
            name="utilidad_operativa",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name="balance",
            name="utilidad_neta_real",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
