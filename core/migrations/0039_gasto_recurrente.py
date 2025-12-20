from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0038_transaccion_naturaleza"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GastoRecurrente",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=120)),
                ("categoria", models.CharField(max_length=50)),
                ("monto", models.DecimalField(decimal_places=2, max_digits=12, validators=[MinValueValidator(0)])),
                ("dia_corte", models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(31)])),
                ("activo", models.BooleanField(default=True)),
                (
                    "naturaleza",
                    models.CharField(
                        choices=[
                            ("operativo", "Operativo"),
                            ("estructural", "Estructural"),
                            ("financiero", "Financiero"),
                        ],
                        default="operativo",
                        max_length=15,
                    ),
                ),
                (
                    "tipo_costo",
                    models.CharField(
                        blank=True,
                        choices=[("fijo", "Fijo"), ("variable", "Variable")],
                        max_length=10,
                    ),
                ),
                ("ultima_generacion", models.DateField(blank=True, null=True)),
                (
                    "responsable",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
    ]