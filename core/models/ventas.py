from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal, ROUND_HALF_UP


class Cliente(models.Model):
    """Comprador habitual o eventual."""
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100)
    email = models.EmailField(null=True, blank=True)
    direccion = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return self.nombre


class Venta(models.Model):
    """Factura generada por la venta de productos."""
    fecha = models.DateField()
    total = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Venta {self.id} - {self.fecha}"

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.total is not None:
            self.total = Decimal(str(self.total)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)


class DetallesVenta(models.Model):
    """Detalle individual dentro de una ``Venta``."""
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE)
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    lote = models.CharField(max_length=50, null=True, blank=True)
    lote_final = models.ForeignKey('LoteProductoFinal', null=True, blank=True, on_delete=models.SET_NULL)

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.cantidad is not None:
            self.cantidad = Decimal(str(self.cantidad)).quantize(quant, ROUND_HALF_UP)
        if self.precio_unitario is not None:
            self.precio_unitario = Decimal(str(self.precio_unitario)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)


class DevolucionProducto(models.Model):
    """Registro de productos devueltos o defectuosos."""

    fecha = models.DateField()
    lote_final = models.ForeignKey('LoteProductoFinal', on_delete=models.CASCADE, null=True, blank=True)
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE)
    motivo = models.CharField(max_length=200)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    responsable = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    reembolso = models.BooleanField(default=False)
    sustitucion = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.producto.nombre} - {self.fecha}"

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.cantidad is not None:
            self.cantidad = Decimal(str(self.cantidad)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)