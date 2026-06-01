import os
from typing import Dict, Any
import requests
from django.core.mail import EmailMessage
from core.models.inventario import Compra, DetalleCompra


def enviar_orden_compra(compra: Compra) -> Dict[str, Any]:
    """Envía la orden de compra por API o correo electrónico."""
    items = [
        {
            "producto": d.producto.nombre,
            "cantidad": float(d.cantidad),
            "precio_unitario": float(d.precio_unitario),
        }
        for d in DetalleCompra.objects.filter(compra=compra).select_related("producto")
    ]
    data = {
        "id": compra.id,
        "fecha": compra.fecha.isoformat(),
        "proveedor": compra.proveedor.nombre,
        "items": items,
        "total": float(compra.total),
    }

    api_url = os.getenv("SUPPLIER_API_URL")
    if api_url:
        headers = {}
        token = os.getenv("SUPPLIER_API_TOKEN")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        resp = requests.post(api_url, json=data, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()

    email = os.getenv("SUPPLIER_EMAIL")
    if not email:
        raise ValueError("No supplier endpoint configured")

    lines = [f"{i['producto']}: {i['cantidad']} x {i['precio_unitario']}" for i in items]
    body = "\n".join(lines) + f"\nTotal: {data['total']}"
    msg = EmailMessage(subject=f"Orden de compra {compra.id}", body=body, to=[email])
    msg.send()
    return {"status": "sent"}