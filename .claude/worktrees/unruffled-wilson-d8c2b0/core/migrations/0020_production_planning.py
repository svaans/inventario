from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0019_monthlyreport'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventoEspecial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField(unique=True)),
                ('nombre', models.CharField(max_length=100)),
                ('factor_demanda', models.FloatField(default=1.0)),
            ],
        ),
        migrations.CreateModel(
            name='CapacidadTurno',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField()),
                ('turno', models.CharField(choices=[('manana', 'Mañana'), ('tarde', 'Tarde'), ('noche', 'Noche')], max_length=10)),
                ('capacidad', models.PositiveIntegerField()),
            ],
            options={
                'unique_together': {('fecha', 'turno')},
            },
        ),
    ]