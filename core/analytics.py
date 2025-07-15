from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Optional, Dict, List

from django.db.models import Sum

from .models import DetallesVenta, Producto


def _parse_date(value: Optional[str], default: Optional[date] = None) -> Optional[date]:
    if not value:
        return default
    try:
        return date.fromisoformat(value)
    except ValueError:
        return default


def rotation_report(start: Optional[date] = None, end: Optional[date] = None) -> Dict[str, List[Dict[str, float]]]:
    """Return products with highest and lowest average daily sales."""
    if end is None:
        end = date.today()
    if start is None:
        start = end - timedelta(days=30)

    qs = (
        DetallesVenta.objects.filter(venta__fecha__range=[start, end])
        .values("producto", "producto__nombre")
        .annotate(total=Sum("cantidad"))
    )
    days = max((end - start).days + 1, 1)
    items = [
        {
            "id": d["producto"],
            "nombre": d["producto__nombre"],
            "promedio_diario": float(d["total"]) / days,
        }
        for d in qs
    ]
    items.sort(key=lambda x: x["promedio_diario"], reverse=True)
    high = items[:5]
    low = items[-5:] if len(items) > 5 else items
    return {"alta_rotacion": high, "baja_rotacion": low}


def association_rules(
    start: Optional[date] = None,
    end: Optional[date] = None,
    min_support: float = 0.05,
    min_confidence: float = 0.3,
) -> List[Dict[str, float]]:
    """Simple association analysis between products sold together."""
    if end is None:
        end = date.today()
    if start is None:
        start = end - timedelta(days=30)

    qs = (
        DetallesVenta.objects.filter(venta__fecha__range=[start, end])
        .values("venta_id", "producto", "producto__nombre")
    )
    orders: Dict[int, set[int]] = defaultdict(set)
    for d in qs:
        orders[int(d["venta_id"])].add(d["producto"])

    counts: Dict[int, int] = defaultdict(int)
    pair_counts: Dict[tuple[int, int], int] = defaultdict(int)
    for items in orders.values():
        for a in items:
            counts[a] += 1
        items_list = list(items)
        for i in range(len(items_list)):
            for j in range(i + 1, len(items_list)):
                pair = tuple(sorted((items_list[i], items_list[j])))
                pair_counts[pair] += 1

    num_orders = max(len(orders), 1)
    rules = []
    for (a, b), pc in pair_counts.items():
        support = pc / num_orders
        confidence = pc / counts[a] if counts[a] else 0.0
        if support >= min_support and confidence >= min_confidence:
            rules.append({
                "producto_a": a,
                "producto_b": b,
                "support": support,
                "confidence": confidence,
            })
    rules.sort(key=lambda r: r["confidence"], reverse=True)
    return rules


def purchase_recommendations(
    start: Optional[date] = None,
    end: Optional[date] = None,
    horizon_days: int = 7,
) -> List[Dict[str, float]]:
    """Suggest purchase or production quantity based on past sales."""
    if end is None:
        end = date.today()
    if start is None:
        start = end - timedelta(days=30)

    rotation = rotation_report(start, end)
    averages = {i["id"]: i["promedio_diario"] for i in rotation["alta_rotacion"] + rotation["baja_rotacion"]}

    recs = []
    productos = Producto.objects.filter(id__in=averages.keys())
    for prod in productos:
        avg = averages.get(prod.id, 0)
        expected = avg * horizon_days
        if prod.stock_actual < expected:
            accion = "comprar" if prod.es_ingrediente else "producir"
            cantidad = float(expected - float(prod.stock_actual))
            recs.append({
                "producto": prod.id,
                "nombre": prod.nombre,
                "accion": accion,
                "cantidad": cantidad,
            })
    return recs


__all__ = [
    "_parse_date",
    "rotation_report",
    "association_rules",
    "purchase_recommendations",
]