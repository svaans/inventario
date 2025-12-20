from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import List, Dict, Any

from django.db.models import Sum, Prefetch

from .models import (
    Producto,
    DetallesVenta,
    Transaccion,
    DevolucionProducto,
    HistorialPrecio,
)


def monthly_profitability_ranking(
    year: int,
    month: int,
    include_summary: bool = False,
) -> Dict[str, Any]:
    """Return most and least profitable products for the given month using real costs."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)

    detalles = (
        DetallesVenta.objects.filter(venta__fecha__gte=start, venta__fecha__lt=end)
        .select_related("producto", "lote_final", "venta")
        .prefetch_related(
            Prefetch(
                "producto__historial",
                queryset=HistorialPrecio.objects.order_by("-fecha"),
                to_attr="historial_cache",
            ),
            Prefetch(
                "producto__devolucionproducto_set",
                queryset=DevolucionProducto.objects.filter(
                    fecha__gte=start, fecha__lt=end
                ).select_related("lote_final"),
                to_attr="devoluciones_cache",
            ),
        )
    )
    by_prod: Dict[int, Dict[str, Decimal | str | Producto]] = {}

    def _cost_from_history(producto: Producto, target_date: date) -> Decimal:
        history = getattr(producto, "historial_cache", [])
        for hist in history:
            if hist.fecha.date() <= target_date:
                return hist.costo if hist.costo is not None else Decimal("0")
        return producto.costo or Decimal("0")
    
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
            unit_cost = _cost_from_history(prod, det.venta.fecha)
        data["cost"] += unit_cost * det.cantidad

    total_units = sum(d["qty"] for d in by_prod.values())
    if total_units == 0:
        response: Dict[str, Any] = {"most_profitable": [], "least_profitable": []}
        if include_summary:
            response["summary"] = {
                "total_products": 0,
                "avg_unit_profit": 0.0,
                "avg_unit_profit_net": 0.0,
            }
        return response

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
    total_profit = Decimal("0")
    total_profit_net = Decimal("0")
    for prod_id, data in by_prod.items():
        qty = data["qty"]
        if qty == 0:
            continue
        prod: Producto = data["producto"]  # type: ignore[assignment]
        avg_price = data["revenue"] / qty
        variable_cost = data["cost"] / qty

        returns_qs = getattr(prod, "devoluciones_cache", [])
        loss_cost = Decimal("0")
        for dev in returns_qs:
            if dev.lote_final:
                u_cost = dev.lote_final.costo_unitario_restante
            else:
                u_cost = _cost_from_history(prod, dev.fecha)
            loss_cost += u_cost * dev.cantidad
        loss_per_unit = loss_cost / qty if qty else Decimal("0")
        profit = avg_price - variable_cost - fixed_per_unit - loss_per_unit
        profit_net = profit - net_per_unit
        total_profit += profit
        total_profit_net += profit_net
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
    response: Dict[str, Any] = {"most_profitable": most, "least_profitable": least}
    if include_summary:
        total_products = len(ranking)
        response["summary"] = {
            "total_products": total_products,
            "avg_unit_profit": float(total_profit / total_products) if total_products else 0.0,
            "avg_unit_profit_net": float(total_profit_net / total_products) if total_products else 0.0,
        }
    return response

__all__ = ["monthly_profitability_ranking"]