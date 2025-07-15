from django.core.management.base import BaseCommand
from core.utils import enviar_alertas_vencimiento

class Command(BaseCommand):
    help = "Envía alertas de lotes próximos a vencer"

    def add_arguments(self, parser):
        parser.add_argument("--dias", type=int, default=7)

    def handle(self, *args, **options):
        dias = options["dias"]
        enviar_alertas_vencimiento(dias)
        self.stdout.write(self.style.SUCCESS("Alertas procesadas"))