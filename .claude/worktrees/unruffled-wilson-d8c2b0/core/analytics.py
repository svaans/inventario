from __future__ import annotations


from datetime import date, timedelta
from typing import Optional, Dict, List

from django.db import connection
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

    with connection.cursor() as cur:
        cur.execute(
            "SELECT COUNT(DISTINCT id) FROM core_venta WHERE fecha BETWEEN %s AND %s",
            [start, end],
        )
        total_orders = cur.fetchone()[0] or 0
        if total_orders == 0:
            return []

        query = """
            WITH product_orders AS (
                SELECT dv.producto_id, dv.venta_id
                FROM core_detallesventa dv
                JOIN core_venta v ON dv.venta_id = v.id
                WHERE v.fecha BETWEEN %s AND %s
                GROUP BY dv.producto_id, dv.venta_id
            ),
            product_counts AS (
                SELECT producto_id, COUNT(*) AS order_count
                FROM product_orders
                GROUP BY producto_id
            ),
            pair_counts AS (
                SELECT p1.producto_id AS a, p2.producto_id AS b, COUNT(*) AS pair_count
                FROM product_orders p1
                JOIN product_orders p2 ON p1.venta_id = p2.venta_id AND p1.producto_id < p2.producto_id
                GROUP BY a, b
            )
            SELECT a, b,
                   pair_count * 1.0 / %s AS support,
                   pair_count * 1.0 / pc.order_count AS confidence
            FROM pair_counts
            JOIN product_counts pc ON pair_counts.a = pc.producto_id
            WHERE (pair_count * 1.0 / %s) >= %s
              AND (pair_count * 1.0 / pc.order_count) >= %s
            ORDER BY confidence DESC
        """
        params = [start, end, total_orders, total_orders, min_support, min_confidence]
        cur.execute(query, params)
        rows = cur.fetchall()
    return [
        {
            "producto_a": r[0],
            "producto_b": r[1],
            "support": float(r[2]),
            "confidence": float(r[3]),
        }
        for r in rows
    ]


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
            accion = "comprar" if prod.tipo.startswith("ingred") else "producir"
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