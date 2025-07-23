from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal, ROUND_HALF_UP


class Balance(models.Model):
    mes = models.IntegerField()
    anio = models.IntegerField()
    total_ingresos = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    total_egresos = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    utilidad = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    def __str__(self):
        return f"Balance {self.mes}/{self.anio}"


class Transaccion(models.Model):
    """Registro de ingresos y egresos del flujo de caja."""

    TIPO_CHOICES = [
        ("ingreso", "Ingreso"),
        ("egreso", "Egreso"),
    ]

    CANAL_INGRESO_CHOICES = [
        ("mostrador", "Mostrador"),
        ("delivery", "Delivery"),
        ("pedido_grande", "Pedidos grandes"),
    ]

    CATEGORIA_EGRESO_CHOICES = [
        ("materia_prima", "Materia prima"),
        ("empaque", "Empaque"),
        ("transporte_pedido", "Transporte por pedido"),
        ("comisiones", "Comisiones"),
        ("sueldos", "Sueldos"),
        ("seguros", "Seguros"),
        ("alquiler", "Alquiler"),
        ("servicios", "Servicios"),
        ("mantenimiento", "Mantenimiento"),
        ("otros", "Otros"),
    ]

    COSTO_FIJO_CATEGORIAS = {"alquiler", "sueldos", "seguros", "servicios"}
    COSTO_VARIABLE_CATEGORIAS = {
        "materia_prima",
        "empaque",
        "transporte_pedido",
        "comisiones",
    }

    TIPO_COSTO_CHOICES = [("fijo", "Fijo"), ("variable", "Variable")]

    fecha = models.DateField()
    monto = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    categoria = models.CharField(max_length=50)
    operativo = models.BooleanField(default=True)
    ACTIVIDAD_CHOICES = [
        ("produccion", "Producción"),
        ("distribucion", "Distribución"),
        ("administracion", "Administración"),
        ("otros", "Otros"),
    ]
    actividad = models.CharField(max_length=20, choices=ACTIVIDAD_CHOICES, blank=True)
    canal = models.CharField(max_length=20, blank=True)
    responsable = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    comprobante = models.FileField(upload_to="comprobantes/", null=True, blank=True)
    descripcion = models.TextField(blank=True)
    tipo_costo = models.CharField(max_length=10, choices=TIPO_COSTO_CHOICES, blank=True)
    revisado = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["fecha"])]

    def __str__(self):
        return f"{self.get_tipo_display()} {self.monto} - {self.fecha}"

    def clean(self):
        if self.tipo == "egreso":
            exists = (
                Transaccion.objects.filter(
                    fecha=self.fecha,
                    monto=self.monto,
                    tipo="egreso",
                    categoria=self.categoria,
                    responsable=self.responsable,
                )
                .exclude(pk=self.pk)
                .exists()
            )
            if exists:
                raise ValidationError("Egreso duplicado")

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.monto is not None:
            self.monto = Decimal(str(self.monto)).quantize(quant, ROUND_HALF_UP)
        if self.tipo == "egreso":
            if not self.tipo_costo:
                if self.categoria in self.COSTO_FIJO_CATEGORIAS:
                    self.tipo_costo = "fijo"
                elif self.categoria in self.COSTO_VARIABLE_CATEGORIAS:
                    self.tipo_costo = "variable"
            if self.pk is None:
                self.revisado = False
        self.full_clean()
        super().save(*args, **kwargs)