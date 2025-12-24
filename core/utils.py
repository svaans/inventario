from __future__ import annotations
from datetime import date, timedelta
from dataclasses import dataclass
from calendar import monthrange
from decimal import Decimal
from typing import Optional, Dict, Any, List

from io import BytesIO

from django.db import transaction
from django.db.models import Sum, F
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
from django.conf import settings
from django.core.files.base import ContentFile
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

from .models import (
    DevolucionProducto,
    Venta,
    FacturaVenta,
    Transaccion,
    GastoRecurrente,
    Producto,
    Compra,
    DetalleCompra,
    MovimientoInventario,
    MonthlyReport,
    LoteMateriaPrima,
    LoteProductoFinal,
    Balance,
)
from .analytics import purchase_recommendations


@dataclass(frozen=True)
class BalanceCalculado:
    ventas_total: Decimal
    compras_total: Decimal
    total_ingresos: Decimal
    total_egresos: Decimal
    utilidad: Decimal
    ingresos_operativos: Decimal
    costos_variables: Decimal
    costos_fijos: Decimal
    gastos_financieros: Decimal
    utilidad_operativa: Decimal
    utilidad_neta_real: Decimal


def calcular_balance_mensual(mes: int, anio: int) -> BalanceCalculado:
    """Calcular métricas financieras mensuales usando ventas, compras y transacciones."""

    def _sum_queryset(qs, field: str) -> Decimal:
        return qs.aggregate(total=Sum(field))["total"] or Decimal("0")

    ventas = Venta.objects.filter(fecha__month=mes, fecha__year=anio)
    compras = Compra.objects.filter(fecha__month=mes, fecha__year=anio)
    transacciones = Transaccion.objects.filter(fecha__month=mes, fecha__year=anio)

    ventas_total = _sum_queryset(ventas, "total")
    compras_total = _sum_queryset(compras, "total")

    ingresos_transacciones = transacciones.filter(tipo="ingreso")
    egresos_transacciones = transacciones.filter(tipo="egreso")

    ingresos_operativos = ventas_total + _sum_queryset(
        ingresos_transacciones.filter(naturaleza="operativo"),
        "monto",
    )

    costos_variables = compras_total + _sum_queryset(
        egresos_transacciones.filter(tipo_costo="variable").exclude(
            naturaleza="financiero"
        ),
        "monto",
    )
    costos_fijos = _sum_queryset(
        egresos_transacciones.filter(tipo_costo="fijo").exclude(naturaleza="financiero"),
        "monto",
    )
    gastos_financieros = _sum_queryset(
        egresos_transacciones.filter(naturaleza="financiero"),
        "monto",
    )

    utilidad_operativa = ingresos_operativos - costos_variables - costos_fijos

    total_ingresos = ventas_total + _sum_queryset(ingresos_transacciones, "monto")
    total_egresos = compras_total + _sum_queryset(egresos_transacciones, "monto")
    utilidad_neta_real = total_ingresos - total_egresos

    return BalanceCalculado(
        ventas_total=ventas_total,
        compras_total=compras_total,
        total_ingresos=total_ingresos,
        total_egresos=total_egresos,
        utilidad=utilidad_neta_real,
        ingresos_operativos=ingresos_operativos,
        costos_variables=costos_variables,
        costos_fijos=costos_fijos,
        gastos_financieros=gastos_financieros,
        utilidad_operativa=utilidad_operativa,
        utilidad_neta_real=utilidad_neta_real,
    )


def actualizar_balance_por_venta(venta: Venta) -> Balance:
    """Actualiza el balance del mes de la venta con los valores recalculados."""
    mes = venta.fecha.month
    anio = venta.fecha.year
    calculo = calcular_balance_mensual(mes, anio)
    balance, _ = Balance.objects.update_or_create(
        mes=mes,
        anio=anio,
        defaults={
            "total_ingresos": calculo.total_ingresos,
            "total_egresos": calculo.total_egresos,
            "utilidad": calculo.utilidad,
            "ingresos_operativos": calculo.ingresos_operativos,
            "costos_variables": calculo.costos_variables,
            "costos_fijos": calculo.costos_fijos,
            "gastos_financieros": calculo.gastos_financieros,
            "utilidad_operativa": calculo.utilidad_operativa,
            "utilidad_neta_real": calculo.utilidad_neta_real,
        },
    )
    return balance


def obtener_balance_mensual(mes: int, anio: int) -> Dict[str, Any]:
    """Devuelve el balance mensual usando el cierre si existe."""
    balance = Balance.objects.filter(mes=mes, anio=anio).first()
    if balance and balance.cerrado:
        return {
            "mes": mes,
            "anio": anio,
            "cerrado": True,
            "total_ingresos": float(balance.total_ingresos),
            "total_egresos": float(balance.total_egresos),
            "utilidad": float(balance.utilidad),
            "ingresos_operativos": float(balance.ingresos_operativos),
            "costos_variables": float(balance.costos_variables),
            "costos_fijos": float(balance.costos_fijos),
            "gastos_financieros": float(balance.gastos_financieros),
            "utilidad_operativa": float(balance.utilidad_operativa),
            "utilidad_neta_real": float(balance.utilidad_neta_real),
        }

    calculo = calcular_balance_mensual(mes, anio)
    data = {
        "mes": mes,
        "anio": anio,
        "cerrado": False,
        "total_ingresos": float(calculo.total_ingresos),
        "total_egresos": float(calculo.total_egresos),
        "utilidad": float(calculo.utilidad),
        "ingresos_operativos": float(calculo.ingresos_operativos),
        "costos_variables": float(calculo.costos_variables),
        "costos_fijos": float(calculo.costos_fijos),
        "gastos_financieros": float(calculo.gastos_financieros),
        "utilidad_operativa": float(calculo.utilidad_operativa),
        "utilidad_neta_real": float(calculo.utilidad_neta_real),
    }

    Balance.objects.update_or_create(
        mes=mes,
        anio=anio,
        defaults={
            "total_ingresos": calculo.total_ingresos,
            "total_egresos": calculo.total_egresos,
            "utilidad": calculo.utilidad,
            "ingresos_operativos": calculo.ingresos_operativos,
            "costos_variables": calculo.costos_variables,
            "costos_fijos": calculo.costos_fijos,
            "gastos_financieros": calculo.gastos_financieros,
            "utilidad_operativa": calculo.utilidad_operativa,
            "utilidad_neta_real": calculo.utilidad_neta_real,
        },
    )
    return data


def generar_transacciones_recurrentes(
    fecha_referencia: Optional[date] = None,
) -> List[Transaccion]:
    """Genera transacciones mensuales desde gastos recurrentes activos."""
    fecha_base = fecha_referencia or date.today()
    last_day = monthrange(fecha_base.year, fecha_base.month)[1]
    created: List[Transaccion] = []
    with transaction.atomic():
        gastos = GastoRecurrente.objects.select_for_update().filter(activo=True)
        for gasto in gastos:
            if gasto.ultima_generacion and (
                gasto.ultima_generacion.year == fecha_base.year
                and gasto.ultima_generacion.month == fecha_base.month
            ):
                continue
            dia = min(gasto.dia_corte, last_day)
            fecha_transaccion = date(fecha_base.year, fecha_base.month, dia)
            descripcion = f"Gasto recurrente: {gasto.nombre}"
            exists = Transaccion.objects.filter(
                tipo="egreso",
                categoria=gasto.categoria,
                monto=gasto.monto,
                responsable=gasto.responsable,
                fecha__year=fecha_base.year,
                fecha__month=fecha_base.month,
                descripcion=descripcion,
            ).exists()
            if exists:
                gasto.ultima_generacion = fecha_transaccion
                gasto.save(update_fields=["ultima_generacion"])
                continue
            transaccion = Transaccion.objects.create(
                fecha=fecha_transaccion,
                monto=gasto.monto,
                tipo="egreso",
                categoria=gasto.categoria,
                operativo=gasto.naturaleza == "operativo",
                naturaleza=gasto.naturaleza,
                tipo_costo=gasto.tipo_costo or "",
                responsable=gasto.responsable,
                descripcion=descripcion,
            )
            gasto.ultima_generacion = fecha_transaccion
            gasto.save(update_fields=["ultima_generacion"])
            created.append(transaccion)
    return created


def consumir_ingrediente_fifo(
    producto: Producto, cantidad: Decimal
) -> List[tuple[Optional["LoteMateriaPrima"], Decimal, Decimal]]:
    """Consume materia prima aplicando rotación FIFO.

    Se busca el stock disponible en los ``LoteMateriaPrima`` según la fecha de
    recepción y se descuenta hasta cubrir ``cantidad``.

    Args:
        producto: Ingrediente a consumir.
        cantidad: Cantidad que se desea descontar.

    Returns:
        Lista de tuplas ``(lote, usado, costo)`` con el origen del consumo y el
        costo asociado. Si no existen lotes el consumo se realiza desde el stock
        del producto y el lote será ``None``.

    Raises:
        ValueError: Si no hay suficiente materia prima disponible.
    """
    consumos: List[tuple[Optional[LoteMateriaPrima], Decimal, Decimal]] = []
    with transaction.atomic():
        producto_lock = Producto.objects.select_for_update().get(pk=producto.pk)
        restante = cantidad
        lotes = (
            LoteMateriaPrima.objects.filter(
                producto=producto_lock, fecha_agotado__isnull=True
            )
            .order_by("fecha_recepcion")
            .select_for_update()
        )
        if not lotes.exists():
            # Fallback al stock del producto si no hay lotes registrados
            disponible = producto_lock.stock_actual
            if disponible < cantidad:
                raise ValueError("No hay suficiente materia prima disponible")
            producto_lock.stock_actual = disponible - cantidad
            producto_lock.save(update_fields=["stock_actual"])
            costo = (producto_lock.costo or Decimal("0")) * cantidad
            consumos.append((None, cantidad, costo))
            return consumos

        total_usado = Decimal("0")
        for lote in lotes:
            disponible = lote.cantidad_disponible
            if disponible <= 0:
                continue
            usar = min(disponible, restante)
            if usar > 0:
                lote.consumir(usar)
                costo = lote.costo_unitario_restante * usar
                consumos.append((lote, usar, costo))
                restante -= usar
                total_usado += usar
            if restante <= 0:
                break
        if restante > 0:
            raise ValueError("No hay suficiente materia prima disponible")
        nuevo_stock = (
            LoteMateriaPrima.objects.filter(producto=producto_lock)
            .aggregate(
                disponible=Sum(F("cantidad_inicial") - F("cantidad_usada"))
            )["disponible"]
            or Decimal("0")
        )
        producto_lock.stock_actual = nuevo_stock
        producto_lock.save(update_fields=["stock_actual"])
    return consumos

def vender_producto_final_fifo(
    producto: Producto, cantidad: Decimal
) -> List[tuple["LoteProductoFinal", Decimal, Decimal]]:
    """Consume stock de productos finales aplicando FIFO por lote.

    Devuelve una lista con los lotes utilizados y la cantidad tomada de cada uno.
    """

    from .models import LoteProductoFinal

    restante = cantidad
    lotes = (
        LoteProductoFinal.objects.filter(producto=producto)
        .order_by("fecha_produccion", "id")
        .select_for_update()
    )

    consumos: List[tuple[LoteProductoFinal, Decimal, Decimal]] = []
    if not lotes.exists():
        return consumos

    for lote in lotes:
        disponible = (
            lote.cantidad_producida
            - lote.cantidad_vendida
            - lote.cantidad_descartada
            + lote.cantidad_devuelta
        )
        if disponible <= 0:
            continue
        usar = min(disponible, restante)
        if usar > 0:
            lote.cantidad_vendida += usar
            lote.save()
            costo = lote.costo_unitario_restante * usar
            consumos.append((lote, usar, costo))
            restante -= usar
        if restante <= 0:
            break

    if restante > 0:
        raise ValueError("No hay suficiente producto final disponible")

    return consumos


def calcular_perdidas_devolucion(
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> Dict[str, Any]:
    """Calcular pérdidas económicas por devoluciones."""
    qs = DevolucionProducto.objects.select_related("producto").filter(
        clasificacion=DevolucionProducto.CLASIFICACION_MERMA
    )
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
    p.drawString(50, y, f"Ventas totales: $ {data['total_sales']}")
    y -= 20
    p.drawString(50, y, f"Costos operativos: $ {data['operating_costs']}")
    y -= 20
    p.drawString(50, y, f"Pérdidas por devoluciones: $ {data['losses_returns']}")
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


def _draw_invoice_header(p: canvas.Canvas, venta: Venta, y: int) -> int:
    p.setFont("Helvetica-Bold", 16)
    p.drawString(200, y, "Factura de venta")
    y -= 25
    p.setFont("Helvetica", 12)
    p.drawString(50, y, f"Factura: F-{venta.id:06d}")
    y -= 18
    p.drawString(50, y, f"Fecha: {venta.fecha}")
    y -= 18
    cliente = venta.cliente.nombre if venta.cliente else "Consumidor final"
    p.drawString(50, y, f"Cliente: {cliente}")
    y -= 18
    if venta.cliente and venta.cliente.email:
        p.drawString(50, y, f"Email: {venta.cliente.email}")
        y -= 18
    p.drawString(50, y, f"Vendedor: {venta.usuario}")
    y -= 30
    return y


def generar_factura_pdf(venta: Venta) -> bytes:
    """Construye un PDF simple de factura con detalle de productos."""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 50

    y = _draw_invoice_header(p, venta, y)

    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, y, "Detalle")
    y -= 20
    p.setFont("Helvetica", 11)
    p.drawString(50, y, "Producto")
    p.drawString(260, y, "Cantidad")
    p.drawString(340, y, "Precio")
    p.drawString(430, y, "Subtotal")
    y -= 15
    p.line(50, y, width - 50, y)
    y -= 15

    for det in venta.detallesventa_set.all():
        p.drawString(50, y, det.producto.nombre[:30])
        p.drawRightString(310, y, f"{det.cantidad}")
        p.drawRightString(400, y, f"${det.precio_unitario}")
        p.drawRightString(500, y, f"${det.cantidad * det.precio_unitario}")
        y -= 15
        if y < 80:
            p.showPage()
            y = _draw_invoice_header(p, venta, height - 80)
            p.setFont("Helvetica", 11)

    y -= 10
    p.line(350, y, width - 50, y)
    y -= 20
    p.setFont("Helvetica-Bold", 12)
    p.drawRightString(500, y, f"Total: ${venta.total}")

    p.showPage()
    p.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def crear_factura_para_venta(venta: Venta) -> FacturaVenta:
    """Genera y guarda la factura en PDF si no existe."""
    if hasattr(venta, "factura"):
        return venta.factura
    pdf_bytes = generar_factura_pdf(venta)
    numero = f"F-{venta.id:06d}"
    factura = FacturaVenta(venta=venta, numero=numero)
    factura.pdf.save(f"{numero}.pdf", ContentFile(pdf_bytes), save=True)
    return factura


def enviar_factura_por_correo(factura: FacturaVenta, correo: str) -> None:
    """Envía la factura generada al correo indicado."""
    subject = f"Factura {factura.numero}"
    message = "Adjuntamos la factura de tu compra. Gracias por tu preferencia."
    email = EmailMessage(subject=subject, body=message, to=[correo])
    factura.pdf.open("rb")
    try:
        email.attach(factura.pdf.name.split('/')[-1], factura.pdf.read(), "application/pdf")
        email.send()
        factura.marcar_enviado(correo)
    finally:
        factura.pdf.close()


def send_monthly_report(year: int, month: int) -> None:
    """Compila, genera y envía el reporte mensual por correo."""
    metrics = compile_monthly_metrics(year, month)
    report, _ = MonthlyReport.objects.get_or_create(mes=month, anio=year)
    pdf = generate_monthly_report_pdf(metrics, report.notas or "")
    subject = f"Reporte mensual {month:02d}/{year}"
    message = "Adjunto encontrarás el resumen mensual del sistema de inventario."
    user_model = get_user_model()
    recipients = list(
        user_model.objects.filter(is_superuser=True).values_list("email", flat=True)
    )
    if not recipients:
        return
    email = EmailMessage(subject=subject, body=message, to=recipients)
    email.attach(f"reporte_{month:02d}_{year}.pdf", pdf, "application/pdf")
    email.send()


def lotes_por_vencer(dias: int = 7) -> List[LoteMateriaPrima]:
    """Devuelve los lotes que vencerán en los próximos ``dias``."""
    limite = date.today() + timedelta(days=dias)
    return list(
        LoteMateriaPrima.objects.filter(
            fecha_vencimiento__lte=limite, fecha_agotado__isnull=True
        )
    )


def enviar_alertas_vencimiento(dias: int = 7) -> None:
    """Envía alertas por correo de los lotes próximos a vencer."""
    lotes = lotes_por_vencer(dias)
    if not lotes:
        return
    lines = [
        f"{lote.codigo} - {lote.producto.nombre} vence {lote.fecha_vencimiento}"
        for lote in lotes
    ]
    mensaje = "\n".join(lines)
    subject = "Lotes próximos a vencer"
    user_model = get_user_model()
    recipients = list(
        user_model.objects.filter(is_superuser=True).values_list("email", flat=True)
    )
    if recipients:
        email = EmailMessage(subject=subject, body=mensaje, to=recipients)
        email.send()


def detectar_faltantes(horizon_days: int = 7) -> List[Dict[str, Any]]:
    """Devuelve sugerencias de compra para insumos con bajo stock."""
    proyeccion = purchase_recommendations(horizon_days=horizon_days)
    rec_map = {p["producto"]: p["cantidad"] for p in proyeccion}
    sugerencias: List[Dict[str, Any]] = []
    for prod in Producto.objects.filter(tipo__startswith="ingred"):
        demanda = rec_map.get(prod.id, 0.0)
        if (
            float(prod.stock_actual) < float(prod.stock_minimo)
            or float(prod.stock_actual) < demanda
        ):
            qty = max(float(prod.stock_minimo), demanda) - float(prod.stock_actual)
            sugerencias.append(
                {
                    "producto": prod.id,
                    "nombre": prod.nombre,
                    "proveedor": prod.proveedor_id,
                    "cantidad": round(qty, 2),
                }
            )
    return sugerencias


def auto_reordenar(confirmar: bool = False, horizon_days: int = 7) -> List[int]:
    """Genera órdenes de compra si hay faltantes y ``confirmar`` es True."""
    sugerencias = detectar_faltantes(horizon_days)
    if not confirmar or not sugerencias:
        return []

    hoy = date.today()
    compras_creadas = []
    by_prov: Dict[int, List[Dict[str, Any]]] = {}
    for s in sugerencias:
        prov = s["proveedor"]
        if prov is None:
            continue
        by_prov.setdefault(prov, []).append(s)

    for prov_id, items in by_prov.items():
        compra = Compra.objects.create(proveedor_id=prov_id, fecha=hoy, total=0)
        total = Decimal("0")
        for item in items:
            prod = Producto.objects.get(id=item["producto"])
            precio = prod.costo or Decimal("0")
            cantidad = Decimal(str(item["cantidad"]))
            DetalleCompra.objects.create(
                compra=compra,
                producto=prod,
                cantidad=cantidad,
                precio_unitario=precio,
            )
            total += cantidad * precio
        compra.total = total
        compra.save()
        compras_creadas.append(compra.id)
    return compras_creadas