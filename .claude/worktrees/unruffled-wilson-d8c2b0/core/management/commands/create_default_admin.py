from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
import os

class Command(BaseCommand):
    help = "Create default admin user if not exists"

    def handle(self, *args, **kwargs):
        username = os.getenv("DJANGO_ADMIN_USER", "admin")
        password = os.getenv("DJANGO_ADMIN_PASSWORD", "admin123")
        email = os.getenv("DJANGO_ADMIN_EMAIL", "admin@example.com")

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(self.style.SUCCESS("✔ Superusuario creado"))
        else:
            self.stdout.write("ℹ Superusuario ya existe")
