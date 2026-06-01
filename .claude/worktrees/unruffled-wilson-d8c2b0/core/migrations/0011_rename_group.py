from django.db import migrations
from django.contrib.auth.models import Group


def rename_administrador_to_admin(apps, schema_editor):
    Group.objects.filter(name='administrador').update(name='admin')

def reverse_rename(apps, schema_editor):
    Group.objects.filter(name='admin').update(name='administrador')


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0010_delete_usuario'),
    ]

    operations = [
        migrations.RunPython(rename_administrador_to_admin, reverse_rename),
    ]