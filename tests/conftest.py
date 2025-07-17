import os
import sys
from pathlib import Path

# Load environment variables for tests
env_file = Path(__file__).resolve().parent / ".env.test"
if env_file.exists():
    with env_file.open() as f:
        for line in f:
            if not line.strip() or line.startswith("#"):
                continue
            key, _, value = line.strip().partition("=")
            if key and _:
                os.environ.setdefault(key, value)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configuracion.settings")
# Ensure project root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
import django
django.setup()

from django.conf import settings

if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.core.management import call_command
import pytest


@pytest.fixture(scope="session", autouse=True)
def run_migrations(django_db_setup, django_db_blocker):
    """Ensure the test database schema is up to date."""
    with django_db_blocker.unblock():
        call_command("migrate", verbosity=0, interactive=False)