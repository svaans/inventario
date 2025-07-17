from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("core", "0026_add_email_direccion_to_cliente"),
    ]

    operations = [
        migrations.RenameField(
            model_name="monthlyreport",
            old_name="month",
            new_name="mes",
        ),
        migrations.RenameField(
            model_name="monthlyreport",
            old_name="year",
            new_name="anio",
        ),
        migrations.RenameField(
            model_name="monthlyreport",
            old_name="notes",
            new_name="notas",
        ),
        migrations.RenameField(
            model_name="monthlyreport",
            old_name="created",
            new_name="creado",
        ),
        migrations.AlterUniqueTogether(
            name="monthlyreport",
            unique_together={("mes", "anio")},
        ),
    ]