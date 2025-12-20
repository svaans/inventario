from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import List, Dict

from django.db.models import Sum, Avg

from .models import Producto, DetallesVenta, Transaccion, DevolucionProducto


def monthly_profitability_ranking(year: int, month: int) -> Dict[str, List[Dict[str, float]]]:
    """Return most and least profitable products for the given month using real costs."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)

    detalles = (
        DetallesVenta.objects.filter(venta__fecha__gte=start, venta__fecha__lt=end)
        .select_related("producto", "lote_final", "venta")
    )
    by_prod: Dict[int, Dict[str, Decimal | str | Producto]] = {}
    for det in detalles:
        prod = det.producto
        data = by_prod.setdefault(
            prod.id,
            {
                "producto": prod,
                "nombre": prod.nombre,
                "qty": Decimal("0"),
                "revenue": Decimal("0"),
                "cost": Decimal("0"),
            },
        )
        data["qty"] += det.cantidad
        data["revenue"] += det.precio_unitario * det.cantidad
        if det.lote_final:
            unit_cost = det.lote_final.costo_unitario_restante
        else:
            hist = (
                prod.historial.filter(fecha__lte=det.venta.fecha)
                .order_by("-fecha")
                .first()
            )
            unit_cost = hist.costo if hist and hist.costo is not None else prod.costo or Decimal("0")
        data["cost"] += unit_cost * det.cantidad

    total_units = sum(d["qty"] for d in by_prod.values())
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
    net_costs = (
        Transaccion.objects.filter(
            tipo="egreso",
            fecha__gte=start,
            fecha__lt=end,
            naturaleza__in=["financiero", "estructural"],
        ).aggregate(total=Sum("monto"))["total"] or Decimal("0")
    )
    net_per_unit = net_costs / Decimal(total_units)

    ranking: List[Dict[str, float]] = []
    for prod_id, data in by_prod.items():
        qty = data["qty"]
        if qty == 0:
            continue
        prod: Producto = data["producto"]  # type: ignore[assignment]
        avg_price = data["revenue"] / qty
        variable_cost = data["cost"] / qty

        returns_qs = DevolucionProducto.objects.filter(
            producto=prod, fecha__gte=start, fecha__lt=end
        ).select_related("lote_final")
        loss_cost = Decimal("0")
        for dev in returns_qs:
            if dev.lote_final:
                u_cost = dev.lote_final.costo_unitario_restante
            else:
                hist = (
                    prod.historial.filter(fecha__lte=dev.fecha)
                    .order_by("-fecha")
                    .first()
                )
                u_cost = hist.costo if hist and hist.costo is not None else prod.costo or Decimal("0")
            loss_cost += u_cost * dev.cantidad
        loss_per_unit = loss_cost / qty if qty else Decimal("0")
        profit = avg_price - variable_cost - fixed_per_unit - loss_per_unit
        profit_net = profit - net_per_unit
        ranking.append(
            {
                "id": prod.id,
                "nombre": data["nombre"],
                "unit_profit": float(profit),
                "unit_profit_net": float(profit_net),
            }
        )

    ranking.sort(key=lambda x: x["unit_profit"], reverse=True)
    most = ranking[:5]
    least = sorted(ranking, key=lambda x: x["unit_profit"])[:5]
    return {"most_profitable": most, "least_profitable": least}

__all__ = ["monthly_profitability_ranking"]