"""
ASGI config for inventario project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from fastapi import FastAPI
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'configuracion.settings')
django.setup()

django_app = get_asgi_application()

from api import app as fastapi_app

main_app = FastAPI()
main_app.mount('/fastapi', fastapi_app)
main_app.mount('/', django_app)

application = main_app
