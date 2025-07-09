import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'configuracion.settings')
# Ensure project root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
django.setup()

from django.conf import settings

if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.core.management import call_command
import pytest


@pytest.fixture(scope="session", autouse=True)
def run_migrations():
    """Ensure the test database schema is up to date."""
    call_command("migrate", verbosity=0, interactive=False)