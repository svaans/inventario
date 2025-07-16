from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0024_create_role_groups"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlanProduccion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fecha", models.DateField()),
                ("sugerido", models.PositiveIntegerField()),
                ("ajustado", models.PositiveIntegerField()),
                ("real", models.PositiveIntegerField(default=0)),
                (
                    "producto",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="core.producto"),
                ),
            ],
            options={"unique_together": {("fecha", "producto")}, "ordering": ["fecha", "producto"]},
        ),
    ]