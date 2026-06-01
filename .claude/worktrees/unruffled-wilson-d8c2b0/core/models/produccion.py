from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class MonthlyReport(models.Model):
    """Notas y reporte mensual generado."""

    mes = models.IntegerField()
    anio = models.IntegerField()
    notas = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("mes", "anio")

    def __str__(self) -> str:
        return f"{self.mes:02d}/{self.anio}"


class EventoEspecial(models.Model):
    """Fechas con eventos o festivos que afectan la demanda."""

    fecha = models.DateField(unique=True)
    nombre = models.CharField(max_length=100)
    factor_demanda = models.FloatField(default=1.0, validators=[MinValueValidator(0)])

    def __str__(self) -> str:
        return f"{self.nombre} ({self.fecha})"


class CapacidadTurno(models.Model):
    """Capacidad de producción disponible por turno."""

    TURNO_CHOICES = [
        ("manana", "Mañana"),
        ("tarde", "Tarde"),
        ("noche", "Noche"),
    ]

    fecha = models.DateField()
    turno = models.CharField(max_length=10, choices=TURNO_CHOICES)
    capacidad = models.PositiveIntegerField()

    class Meta:
        unique_together = ("fecha", "turno")

    def __str__(self) -> str:
        return f"{self.fecha} {self.turno}: {self.capacidad}"


class RegistroTurno(models.Model):
    """Registro de producción y ventas por turno de los empleados."""

    fecha = models.DateField()
    turno = models.CharField(max_length=10, choices=CapacidadTurno.TURNO_CHOICES)
    empleados = models.ManyToManyField(settings.AUTH_USER_MODEL)
    produccion = models.PositiveIntegerField(default=0)
    ventas = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    horas_trabajadas = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    productos_defectuosos = models.PositiveIntegerField(default=0)
    devoluciones = models.PositiveIntegerField(default=0)
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ["-fecha", "turno"]

    def __str__(self) -> str:
        return f"{self.fecha} {self.turno}"

    @property
    def eficiencia(self) -> float:
        """Unidades producidas por hora por persona."""
        empleados = self.empleados.count() or 1
        horas = float(self.horas_trabajadas or 0)
        if horas <= 0:
            return 0.0
        return float(self.produccion) / (horas * empleados)


class PlanProduccion(models.Model):
    """Registro de cantidades planificadas y reales por producto y fecha."""

    fecha = models.DateField()
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE)
    sugerido = models.PositiveIntegerField()
    ajustado = models.PositiveIntegerField()
    real = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("fecha", "producto")
        ordering = ["fecha", "producto"]

    def __str__(self) -> str:
        return f"{self.fecha} {self.producto.nombre}"