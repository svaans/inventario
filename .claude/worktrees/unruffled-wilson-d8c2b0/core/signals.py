from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from .models import AuditLog, Producto, Compra, Venta, Transaccion, GastoRecurrente
from .utils import actualizar_balance_para_periodo, calcular_balance_mensual


@receiver(post_save, sender=Producto)
@receiver(post_delete, sender=Producto)
def log_producto_change(sender, instance, **kwargs):
    action = "creado" if kwargs.get("created") else ("eliminado" if kwargs.get("signal") == post_delete else "actualizado")
    AuditLog.objects.create(
        usuario=getattr(instance, "usuario", None),
        accion=action,
        tipo_contenido=ContentType.objects.get_for_model(instance),
        objeto_id=instance.pk,
    )


@receiver(post_save, sender=Compra)
@receiver(post_delete, sender=Compra)
def log_compra_change(sender, instance, **kwargs):
    action = "creada" if kwargs.get("created") else ("eliminada" if kwargs.get("signal") == post_delete else "actualizada")
    AuditLog.objects.create(
        usuario=getattr(instance, "usuario", None),
        accion=action,
        tipo_contenido=ContentType.objects.get_for_model(instance),
        objeto_id=instance.pk,
    )
    if instance.fecha:
        calcular_y_actualizar_balance(instance.fecha.month, instance.fecha.year)


@receiver(post_save, sender=Venta)
@receiver(post_delete, sender=Venta)
def log_venta_change(sender, instance, **kwargs):
    action = "creada" if kwargs.get("created") else ("eliminada" if kwargs.get("signal") == post_delete else "actualizada")
    AuditLog.objects.create(
        usuario=getattr(instance, "usuario", None),
        accion=action,
        tipo_contenido=ContentType.objects.get_for_model(instance),
        objeto_id=instance.pk,
    )
    if instance.fecha:
        calcular_y_actualizar_balance(instance.fecha.month, instance.fecha.year)


@receiver(post_save, sender=Transaccion)
@receiver(post_delete, sender=Transaccion)
def log_transaccion_change(sender, instance, **kwargs):
    action = "creada" if kwargs.get("created") else ("eliminada" if kwargs.get("signal") == post_delete else "actualizada")
    AuditLog.objects.create(
        usuario=getattr(instance, "responsable", None),
        accion=action,
        tipo_contenido=ContentType.objects.get_for_model(instance),
        objeto_id=instance.pk,
    )
    if instance.fecha:
        calcular_y_actualizar_balance(instance.fecha.month, instance.fecha.year)


@receiver(post_save, sender=GastoRecurrente)
@receiver(post_delete, sender=GastoRecurrente)
def log_gasto_recurrente_change(sender, instance, **kwargs):
    action = "creado" if kwargs.get("created") else ("eliminado" if kwargs.get("signal") == post_delete else "actualizado")
    AuditLog.objects.create(
        usuario=getattr(instance, "responsable", None),
        accion=action,
        tipo_contenido=ContentType.objects.get_for_model(instance),
        objeto_id=instance.pk,
    )


def calcular_y_actualizar_balance(mes: int, anio: int) -> None:
    """Recalcula y persiste el balance para el periodo dado."""
    calculo = calcular_balance_mensual(mes, anio)
    actualizar_balance_para_periodo(mes, anio, calculo)