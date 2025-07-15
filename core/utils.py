from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import Optional, Dict, Any

from django.db.models import Sum

from .models import DevolucionProducto, Venta


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