from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import List, Dict

from django.db.models import Sum, Avg

from .models import Producto, DetallesVenta, Transaccion, DevolucionProducto


def monthly_profitability_ranking(year: int, month: int) -> Dict[str, List[Dict[str, float]]]:
    """Return most and least profitable products for the given month."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)

    sales_qs = (
        DetallesVenta.objects.filter(venta__fecha__gte=start, venta__fecha__lt=end)
        .values("producto", "producto__nombre")
        .annotate(total_qty=Sum("cantidad"), avg_price=Avg("precio_unitario"))
    )
    total_units = sum(d["total_qty"] or 0 for d in sales_qs)
    if total_units == 0:
        return {"most_profitable": [], "least_profitable": []}

    fixed_costs = (
        Transaccion.objects.filter(
            tipo="egreso",
            fecha__gte=start,
            fecha__lt=end,
            tipo_costo="fijo",
        ).aggregate(total=Sum("monto"))["total"] or Decimal("0")
    )
    fixed_per_unit = fixed_costs / Decimal(total_units)

    ranking: List[Dict[str, float]] = []
    for d in sales_qs:
        prod = Producto.objects.get(id=d["producto"])
        qty = Decimal(d["total_qty"] or 0)
        if qty == 0:
            continue
        avg_price = Decimal(d["avg_price"] or prod.precio)
        variable_cost = Decimal(prod.costo or 0)
        returns = (
            DevolucionProducto.objects.filter(
                producto=prod, fecha__gte=start, fecha__lt=end
            ).aggregate(total=Sum("cantidad"))["total"] or Decimal("0")
        )
        loss_per_unit = (returns * variable_cost) / qty if qty else Decimal("0")
        profit = avg_price - variable_cost - fixed_per_unit - loss_per_unit
        ranking.append({
            "id": prod.id,
            "nombre": prod.nombre,
            "unit_profit": float(profit),
        })

    ranking.sort(key=lambda x: x["unit_profit"], reverse=True)
    most = ranking[:5]
    least = sorted(ranking, key=lambda x: x["unit_profit"])[:5]
    return {"most_profitable": most, "least_profitable": least}

__all__ = ["monthly_profitability_ranking"]