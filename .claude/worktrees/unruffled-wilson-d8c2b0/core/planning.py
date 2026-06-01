from datetime import date, timedelta
from typing import Dict, List

from django.db.models import Sum
from django.db.models.functions import ExtractWeekDay

from .models import (
    Producto,
    DetallesVenta,
    ComposicionProducto,
    EventoEspecial,
    CapacidadTurno,
)


_DEF_WEEKS = 4


def generar_plan(fecha: date) -> Dict[str, object]:
    """Genera un plan de producción para la fecha indicada."""
    start = fecha - timedelta(weeks=_DEF_WEEKS)

    # ventas históricas del mismo día de la semana
    # ExtractWeekDay uses Sunday=1 ... Saturday=7
    weekday = (fecha.isoweekday() % 7) + 1
    sales_qs = (
        DetallesVenta.objects.filter(
            venta__fecha__gte=start, venta__fecha__lt=fecha
        )
        .annotate(wday=ExtractWeekDay("venta__fecha"))
        .filter(wday=weekday)
        .values("producto")
        .annotate(total=Sum("cantidad"))
    )
    avg_sales = {s["producto"]: float(s["total"]) / _DEF_WEEKS for s in sales_qs}

    factor = (
        EventoEspecial.objects.filter(fecha=fecha).values_list("factor_demanda", flat=True).first()
        or 1.0
    )

    plan: List[Dict[str, object]] = []
    total_units = 0.0
    alerts: List[Dict[str, object]] = []

    productos = Producto.objects.filter(tipo__in=["empanada", "producto_final"])
    for prod in productos:
        demanda = avg_sales.get(prod.id, 0.0) * factor
        # límite por inventario
        limit = None
        comps = ComposicionProducto.objects.filter(producto_final=prod, activo=True)
        for c in comps:
            if c.cantidad_requerida <= 0:
                continue
            disponible = float(c.ingrediente.stock_actual) / float(c.cantidad_requerida)
            limit = disponible if limit is None else min(limit, disponible)
        if limit is None:
            limit = float("inf")
        unidades = min(demanda, limit)
        if limit < demanda:
            alerts.append({"producto": prod.nombre, "tipo": "inventario"})
        plan.append({"producto": prod.id, "nombre": prod.nombre, "unidades": int(unidades)})
        total_units += unidades

    capacidad = (
        CapacidadTurno.objects.filter(fecha=fecha).aggregate(total=Sum("capacidad"))[
            "total"
        ]
        or 0
    )
    if capacidad and total_units > capacidad:
        scale = capacidad / total_units
        for p in plan:
            p["unidades"] = int(p["unidades"] * scale)
        alerts.append({"tipo": "capacidad", "capacidad": capacidad})

    return {"fecha": fecha.isoformat(), "plan": plan, "alerts": alerts}