from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import Optional, Dict, Any, List

from io import BytesIO

from django.db.models import Sum, F
from django.core.mail import EmailMessage
from django.conf import settings
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

from .models import DevolucionProducto, Venta, Transaccion, Producto, MonthlyReport
from .analytics import purchase_recommendations


def calcular_perdidas_devolucion(
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> Dict[str, Any]:
    """Calcular pérdidas económicas por devoluciones."""
    qs = DevolucionProducto.objects.select_related("producto")
    if start:
        qs = qs.filter(fecha__gte=start)
    if end:
        qs = qs.filter(fecha__lte=end)

    by_month: Dict[date, Decimal] = {}
    by_cause: Dict[str, Decimal] = {}
    by_type: Dict[str, Decimal] = {}

    total_loss = Decimal("0")
    for d in qs:
        unit_cost = d.producto.costo or Decimal("0")
        loss = d.cantidad * unit_cost
        if d.sustitucion:
            loss += d.cantidad * unit_cost
        total_loss += loss
        month_key = d.fecha.replace(day=1)
        by_month[month_key] = by_month.get(month_key, Decimal("0")) + loss
        by_cause[d.motivo] = by_cause.get(d.motivo, Decimal("0")) + loss
        tipo = d.producto.tipo
        by_type[tipo] = by_type.get(tipo, Decimal("0")) + loss

    sales_qs = Venta.objects.all()
    if start:
        sales_qs = sales_qs.filter(fecha__gte=start)
    if end:
        sales_qs = sales_qs.filter(fecha__lte=end)
    total_sales = sales_qs.aggregate(total=Sum("total"))["total"] or Decimal("0")
    impact = (total_loss / total_sales * Decimal("100")) if total_sales else Decimal("0")

    return {
        "total_loss": float(total_loss),
        "total_sales": float(total_sales),
        "impact_percent": float(impact),
        "by_month": {k.isoformat(): float(v) for k, v in by_month.items()},
        "by_cause": {k: float(v) for k, v in by_cause.items()},
        "by_type": {k: float(v) for k, v in by_type.items()},
    }


def compile_monthly_metrics(year: int, month: int) -> Dict[str, Any]:
    """Compila métricas clave del mes."""
    start = date(year, month, 1)
    end_month = month + 1
    end_year = year
    if end_month > 12:
        end_month = 1
        end_year += 1
    end = date(end_year, end_month, 1)

    total_sales = (
        Venta.objects.filter(fecha__gte=start, fecha__lt=end).aggregate(total=Sum("total"))[
            "total"
        ]
        or Decimal("0")
    )

    operating_costs = (
        Transaccion.objects.filter(
            fecha__gte=start,
            fecha__lt=end,
            tipo="egreso",
            operativo=True,
        ).aggregate(total=Sum("monto"))["total"]
        or Decimal("0")
    )

    critical = list(
        Producto.objects.filter(stock_actual__lte=F("stock_minimo")).values(
            "id",
            "nombre",
            "stock_actual",
            "stock_minimo",
        )
    )

    losses = calcular_perdidas_devolucion(start, end)["total_loss"]

    projection = purchase_recommendations(start, end, horizon_days=30)

    alerts = list(
        Producto.objects.filter(stock_actual__lt=F("stock_minimo")).values(
            "id",
            "nombre",
            "stock_actual",
            "stock_minimo",
        )
    )

    return {
        "total_sales": float(total_sales),
        "operating_costs": float(operating_costs),
        "critical_inventory": critical,
        "losses_returns": losses,
        "demand_projection": projection,
        "alerts": alerts,
    }


def generate_monthly_report_pdf(data: Dict[str, Any], notes: str = "") -> bytes:
    """Genera un PDF sencillo con los KPIs mensuales."""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    y = 800
    p.setFont("Helvetica-Bold", 16)
    p.drawString(200, y, "Resumen Mensual")
    y -= 40
    p.setFont("Helvetica", 12)
    p.drawString(50, y, f"Ventas totales: € {data['total_sales']}")
    y -= 20
    p.drawString(50, y, f"Costos operativos: € {data['operating_costs']}")
    y -= 20
    p.drawString(50, y, f"Pérdidas por devoluciones: € {data['losses_returns']}")
    y -= 20
    p.drawString(50, y, "Inventario crítico: " + str(len(data['critical_inventory'])))
    y -= 20
    p.drawString(50, y, "Proyecciones de demanda: " + str(len(data['demand_projection'])))
    y -= 40
    if notes:
        p.drawString(50, y, "Notas:")
        y -= 20
        for line in notes.splitlines():
            p.drawString(60, y, line)
            y -= 15
    p.showPage()
    p.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def send_monthly_report(year: int, month: int) -> None:
    """Compila, genera y envía el reporte mensual por correo."""
    metrics = compile_monthly_metrics(year, month)
    report, _ = MonthlyReport.objects.get_or_create(month=month, year=year)
    pdf = generate_monthly_report_pdf(metrics, report.notes or "")
    subject = f"Reporte mensual {month:02d}/{year}"
    message = "Adjunto encontrarás el resumen mensual del sistema de inventario."
    recipients = list(
        settings.AUTH_USER_MODEL.objects.filter(is_superuser=True).values_list("email", flat=True)
    )
    if not recipients:
        return
    email = EmailMessage(subject=subject, body=message, to=recipients)
    email.attach(f"reporte_{month:02d}_{year}.pdf", pdf, "application/pdf")
    email.send()