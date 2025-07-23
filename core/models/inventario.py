from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal, ROUND_HALF_UP
from datetime import date


class Categoria(models.Model):
    """Clasificación para agrupar productos similares."""
    nombre_categoria = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre_categoria


class UnidadMedida(models.Model):
    """Unidades estándar para los productos."""

    nombre = models.CharField(max_length=50)
    abreviatura = models.CharField(max_length=10)

    class Meta:
        verbose_name_plural = "Unidades de medida"

    def __str__(self) -> str:
        return self.abreviatura


class Producto(models.Model):
    """Artículo o insumo gestionado en el inventario.

    Destaca campos como ``codigo`` y ``tipo`` para identificarlo, además
    del precio, costo y existencias.
    """
    TIPO_CHOICES = [
        ("empanada", "Empanada"),
        ("ingredientes", "Ingredientes"),
        ("producto_final", "Producto final"),
        ("ingrediente", "Ingrediente"),
        ("bebida", "Bebida"),
    ]

    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, default="")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    precio = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unidad_media = models.ForeignKey(UnidadMedida, on_delete=models.PROTECT, null=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    proveedor = models.ForeignKey('Proveedor', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        """Guardar el producto y registrar cambios de precio o costo."""
        quant = Decimal("0.01")
        if self.precio is not None:
            self.precio = Decimal(str(self.precio)).quantize(quant, ROUND_HALF_UP)
        if self.costo is not None:
            self.costo = Decimal(str(self.costo)).quantize(quant, ROUND_HALF_UP)
        if self.stock_actual is not None:
            self.stock_actual = Decimal(str(self.stock_actual)).quantize(quant, ROUND_HALF_UP)
        if self.stock_minimo is not None:
            self.stock_minimo = Decimal(str(self.stock_minimo)).quantize(quant, ROUND_HALF_UP)

        old_precio = None
        old_costo = None
        if self.pk:
            prev = Producto.objects.filter(pk=self.pk).first()
            if prev:
                old_precio = prev.precio
                old_costo = prev.costo
        super().save(*args, **kwargs)

        if old_precio is None or old_precio != self.precio or old_costo != self.costo:
            HistorialPrecio.objects.create(
                producto=self,
                precio=self.precio,
                costo=self.costo,
            )


class HistorialPrecio(models.Model):
    """Registro de precios y costos históricos por producto."""

    producto = models.ForeignKey(Producto, related_name="historial", on_delete=models.CASCADE)
    precio = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    costo = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self) -> str:
        return f"{self.producto.nombre} - {self.fecha:%Y-%m-%d}"


class Proveedor(models.Model):
    """Entidad que abastece productos o insumos."""
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200)

    def __str__(self):
        return self.nombre


class Compra(models.Model):
    """Orden de compra generada a un proveedor."""
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    fecha = models.DateField()
    total = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    def __str__(self):
        return f"Compra {self.id} - {self.fecha}"

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.total is not None:
            self.total = Decimal(str(self.total)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)


class DetalleCompra(models.Model):
    """Linea individual de una ``Compra``."""
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.cantidad is not None:
            self.cantidad = Decimal(str(self.cantidad)).quantize(quant, ROUND_HALF_UP)
        if self.precio_unitario is not None:
            self.precio_unitario = Decimal(str(self.precio_unitario)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)


class ComposicionProducto(models.Model):
    """Relación de ingredientes para elaborar un producto final."""
    producto_final = models.ForeignKey(Producto, related_name="ingredientes", on_delete=models.CASCADE)
    ingrediente = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad_requerida = models.FloatField(
        help_text="Cantidad requerida del ingrediente (en gramos, litros, etc.)",
        validators=[MinValueValidator(0)],
    )
    lote = models.CharField(max_length=50, null=True, blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.producto_final.nombre} -> {self.ingrediente.nombre}"


class MovimientoInventario(models.Model):
    """Registro de entradas y salidas de un ``Producto``."""
    TIPO_CHOICES = [
        ("entrada", "Entrada"),
        ("salida", "Salida"),
    ]

    producto = models.ForeignKey("Producto", null=True, on_delete=models.SET_NULL)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    fecha = models.DateTimeField(auto_now_add=True)
    motivo = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.tipo.title()} - {self.producto.nombre} ({self.cantidad})"


class LoteMateriaPrima(models.Model):
    """Lotes de ingredientes o materia prima."""

    codigo = models.CharField(max_length=50, unique=True)
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        limit_choices_to={"tipo__startswith": "ingred"},
    )
    fecha_recepcion = models.DateField()
    fecha_vencimiento = models.DateField(default=date.today)
    cantidad_inicial = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    cantidad_usada = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    fecha_agotado = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.codigo} - {self.producto.nombre}"

    @property
    def fecha_ingreso(self):
        """Alias para la fecha de recepción."""
        return self.fecha_recepcion

    @property
    def cantidad_disponible(self):
        return self.cantidad_inicial - self.cantidad_usada

    def consumir(self, cantidad):
        from datetime import date

        if cantidad > self.cantidad_disponible:
            raise ValueError("Stock insuficiente en el lote")
        self.cantidad_usada += cantidad
        if self.cantidad_disponible <= 0 and not self.fecha_agotado:
            self.fecha_agotado = date.today()
        self.save()

    @property
    def dias_para_vencer(self):
        from datetime import date

        return (self.fecha_vencimiento - date.today()).days

    @property
    def descuento_sugerido(self):
        dias = self.dias_para_vencer
        if dias <= 0:
            return 0.5
        if dias <= 3:
            return 0.3
        if dias <= 7:
            return 0.1
        return 0.0

    @property
    def costo_unitario_restante(self):
        """Costo por unidad para este lote basado en el historial del producto."""
        hist = (
            self.producto.historial.filter(fecha__lte=self.fecha_recepcion)
            .order_by("-fecha")
            .first()
        )
        if not hist:
            hist = self.producto.historial.order_by("fecha").first()
        if hist and hist.costo is not None:
            return hist.costo
        return self.producto.costo or Decimal("0")


class LoteProductoFinal(models.Model):
    """Lote producido para un producto final."""

    codigo = models.CharField(max_length=50, unique=True)
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        limit_choices_to={"tipo__in": ["empanada", "producto_final", "bebida"]},
    )
    fecha_produccion = models.DateField()
    cantidad_producida = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    cantidad_vendida = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    cantidad_devuelta = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    ingredientes = models.ManyToManyField(
        LoteMateriaPrima,
        through="UsoLoteMateriaPrima",
        related_name="lotes_finales",
    )

    def __str__(self):
        return f"{self.codigo} - {self.producto.nombre}"

    @property
    def costo_unitario_restante(self):
        """Costo por unidad del lote de producto final."""
        hist = (
            self.producto.historial.filter(fecha__lte=self.fecha_produccion)
            .order_by("-fecha")
            .first()
        )
        if not hist:
            hist = self.producto.historial.order_by("fecha").first()
        if hist and hist.costo is not None:
            return hist.costo
        return self.producto.costo or Decimal("0")


class UsoLoteMateriaPrima(models.Model):
    """Registro de utilización de un lote de materia prima en un lote final."""

    lote_materia_prima = models.ForeignKey(
        LoteMateriaPrima, related_name="usos", on_delete=models.CASCADE
    )
    lote_producto_final = models.ForeignKey(
        LoteProductoFinal, related_name="usos", on_delete=models.CASCADE
    )
    fecha = models.DateField()
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    def __str__(self):
        return f"{self.lote_materia_prima.codigo} -> {self.lote_producto_final.codigo}"