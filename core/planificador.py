from datetime import date, timedelta
from typing import Any, Dict, List


from .planning import generar_plan
from .models import PlanProduccion, Producto


def _guardar_plan(plan: Dict[str, Any]) -> None:
    fecha = date.fromisoformat(plan["fecha"])
    for item in plan["plan"]:
        PlanProduccion.objects.update_or_create(
            fecha=fecha,
            producto_id=item["producto"],
            defaults={"sugerido": item["unidades"], "ajustado": item["unidades"]},
        )


def sugerencia_diaria(fecha: date, persist: bool = True) -> Dict[str, Any]:
    plan = generar_plan(fecha)
    if persist:
        _guardar_plan(plan)
    return plan


def sugerencia_semanal(inicio: date, persist: bool = True) -> Dict[str, Any]:
    dias: List[Dict[str, Any]] = []
    for i in range(7):
        d = inicio + timedelta(days=i)
        dias.append(sugerencia_diaria(d, persist=persist))
    resumen: Dict[int, int] = {}
    for day in dias:
        for item in day["plan"]:
            resumen[item["producto"]] = resumen.get(item["producto"], 0) + item["unidades"]
    resumen_list = [
        {
            "producto": pid,
            "nombre": Producto.objects.get(pk=pid).nombre,
            "unidades": unidades,
        }
        for pid, unidades in resumen.items()
    ]
    return {
        "inicio": inicio.isoformat(),
        "fin": (inicio + timedelta(days=6)).isoformat(),
        "resumen": resumen_list,
        "dias": dias,
    }


def ajustar_plan(fecha: date, ajustes: Dict[int, int]) -> None:
    for pid, unidades in ajustes.items():
        obj, _ = PlanProduccion.objects.get_or_create(
            fecha=fecha,
            producto_id=pid,
            defaults={"sugerido": unidades, "ajustado": unidades},
        )
        obj.ajustado = unidades
        obj.save()


def registrar_real(fecha: date, produccion: Dict[int, int]) -> None:
    for pid, real in produccion.items():
        obj, _ = PlanProduccion.objects.get_or_create(
            fecha=fecha,
            producto_id=pid,
            defaults={"sugerido": real, "ajustado": real, "real": real},
        )
        obj.real = real
        obj.save()


__all__ = [
    "sugerencia_diaria",
    "sugerencia_semanal",
    "ajustar_plan",
    "registrar_real",
]