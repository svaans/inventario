from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0046_proveedor_telefono_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='compra',
            name='estado',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('pendiente', 'Pendiente'),
                    ('recibido', 'Recibido'),
                    ('parcial', 'Recibido parcial'),
                ],
                default='recibido',
            ),
        ),
    ]
