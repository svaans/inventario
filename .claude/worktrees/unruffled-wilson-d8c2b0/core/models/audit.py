from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class AuditLog(models.Model):
    """Entrada de auditoría para registrar cambios en modelos clave."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    accion = models.CharField(max_length=20)
    fecha = models.DateTimeField(auto_now_add=True)
    tipo_contenido = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    objeto_id = models.PositiveIntegerField()
    objeto = GenericForeignKey("tipo_contenido", "objeto_id")

    class Meta:
        ordering = ["-fecha"]

    def __str__(self) -> str:  # pragma: no cover - simple repr
        return f"{self.fecha:%Y-%m-%d %H:%M} {self.accion} {self.objeto}"