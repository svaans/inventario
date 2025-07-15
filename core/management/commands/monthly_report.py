from django.core.management.base import BaseCommand
from django.utils import timezone

from core.utils import send_monthly_report

class Command(BaseCommand):
    help = "Genera y envía el reporte mensual"

    def add_arguments(self, parser):
        parser.add_argument("year", type=int, nargs="?", default=None)
        parser.add_argument("month", type=int, nargs="?", default=None)

    def handle(self, *args, **options):
        year = options["year"]
        month = options["month"]
        today = timezone.now().date()
        if year is None or month is None:
            year = today.year if today.month > 1 else today.year - 1
            month = today.month - 1 if today.month > 1 else 12
        send_monthly_report(year, month)
        self.stdout.write(self.style.SUCCESS("Reporte enviado"))