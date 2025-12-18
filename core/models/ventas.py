from django.db import models, transaction
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
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

    CLASIFICACION_REINTEGRO = "reintegro"
    CLASIFICACION_MERMA = "merma"
    CLASIFICACION_CHOICES = [
        (CLASIFICACION_REINTEGRO, "Reintegro"),
        (CLASIFICACION_MERMA, "Merma"),
    ]

    fecha = models.DateField()
    lote_final = models.ForeignKey('LoteProductoFinal', on_delete=models.CASCADE, null=True, blank=True)
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE)
    motivo = models.CharField(max_length=200)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    responsable = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    reembolso = models.BooleanField(default=False)
    sustitucion = models.BooleanField(default=False)
    clasificacion = models.CharField(
        max_length=20,
        choices=CLASIFICACION_CHOICES,
        default=CLASIFICACION_MERMA,
    )

    def __str__(self):
        return f"{self.producto.nombre} - {self.fecha}"

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.cantidad is not None:
            self.cantidad = Decimal(str(self.cantidad)).quantize(quant, ROUND_HALF_UP)
        is_new = self.pk is None
        with transaction.atomic():
            super().save(*args, **kwargs)
            if is_new:
                self._ajustar_inventario()

    def _ajustar_inventario(self):
        from .inventario import Producto, LoteProductoFinal, MovimientoInventario

        cantidad = self.cantidad
        try:
            producto = (
                Producto.objects.select_for_update()
                .get(pk=self.producto_id)
            )
        except Producto.DoesNotExist:
            raise ValidationError({"producto": "Producto inválido"})

        lote = None
        if self.lote_final_id:
            lote = (
                LoteProductoFinal.objects.select_for_update()
                .filter(pk=self.lote_final_id)
                .first()
            )

            if self.clasificacion == self.CLASIFICACION_REINTEGRO:
                if lote:
                    lote.cantidad_devuelta = (lote.cantidad_devuelta or 0) + cantidad
                    lote.save()
                producto.stock_actual = (producto.stock_actual or 0) + cantidad
                producto.save()
                MovimientoInventario.objects.create(
                    producto=producto,
                    tipo="entrada",
                    cantidad=cantidad,
                    motivo=f"Devolución aprovechable: {self.motivo}",
                    usuario=self.responsable,
                    operacion_tipo=MovimientoInventario.OPERACION_DEVOLUCION,
                    devolucion=self,
                )
            else:
                if producto.stock_actual < cantidad:
                    raise ValidationError({"cantidad": "Stock insuficiente para registrar la merma"})
                producto.stock_actual -= cantidad
                producto.save()
                if lote:
                    lote.cantidad_descartada = (lote.cantidad_descartada or 0) + cantidad
                    lote.save()
                MovimientoInventario.objects.create(
                    producto=producto,
                    tipo="salida",
                    cantidad=cantidad,
                    motivo=f"Merma por devolución: {self.motivo}",
                    usuario=self.responsable,
                    operacion_tipo=MovimientoInventario.OPERACION_DEVOLUCION,
                    devolucion=self,
                )