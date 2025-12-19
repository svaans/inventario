from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db.models.functions import Lower
from decimal import Decimal, ROUND_HALF_UP
from datetime import date


class FamiliaProducto(models.Model):
    """Agrupación estandarizada de productos."""

    class Clave(models.TextChoices):
        BEBIDAS = "bebidas", "Bebidas"
        EMPANADAS = "empanadas", "Empanadas"
        INGREDIENTES = "ingredientes", "Ingredientes"
        OTROS = "otros", "Otros"

    clave = models.CharField(max_length=20, choices=Clave.choices, unique=True)
    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("nombre"), name="familia_nombre_ci_unique"),
        ]
        verbose_name = "Familia de producto"
        verbose_name_plural = "Familias de producto"

    def __str__(self) -> str:  # pragma: no cover - representational
        return self.nombre


class Categoria(models.Model):
    """Clasificación para agrupar productos similares."""
    nombre_categoria = models.CharField(max_length=100)
    familia = models.ForeignKey(FamiliaProducto, on_delete=models.PROTECT, related_name="categorias")

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("nombre_categoria"), name="categoria_nombre_ci_unique"),
        ]

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
        ("ingrediente", "Ingrediente"),
        ("producto_final", "Producto final"),
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
    unidad_media = models.ForeignKey(UnidadMedida, on_delete=models.PROTECT)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    familia = models.ForeignKey(FamiliaProducto, on_delete=models.PROTECT, related_name="productos")
    proveedor = models.ForeignKey('Proveedor', on_delete=models.CASCADE, null=True, blank=True)
    impuesto = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    descuento_base = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    unidad_empaque = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    fecha_alta = models.DateField(default=date.today)
    vida_util_dias = models.PositiveIntegerField(default=0)
    fecha_caducidad = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    control_por_lote = models.BooleanField(default=False)
    control_por_serie = models.BooleanField(default=False)
    codigo_barras = models.CharField(max_length=64, blank=True, default="")
    stock_seguridad = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    nivel_reorden = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    lead_time_dias = models.PositiveIntegerField(default=0)
    merma_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    rendimiento_receta = models.DecimalField(max_digits=10, decimal_places=2, default=1, validators=[MinValueValidator(0.01)])
    costo_estandar = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    costo_promedio = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    fecha_costo = models.DateField(null=True, blank=True)
    almacen_origen = models.CharField(max_length=100, blank=True, default="")
    imagen_url = models.URLField(blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("nombre"), name="producto_nombre_ci_unique"),
        ]

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        """Guardar el producto y registrar cambios de precio o costo."""
        if self.tipo == "ingredientes":
            self.tipo = "ingrediente"

        if self.categoria_id and not self.familia_id:
            self.familia = self.categoria.familia

        quant = Decimal("0.01")
        campos_decimal = [
            "precio",
            "costo",
            "stock_actual",
            "stock_minimo",
            "impuesto",
            "descuento_base",
            "stock_seguridad",
            "nivel_reorden",
            "merma_porcentaje",
            "rendimiento_receta",
            "costo_estandar",
            "costo_promedio",
        ]
        for field in campos_decimal:
            value = getattr(self, field, None)
            if value is not None:
                setattr(self, field, Decimal(str(value)).quantize(quant, ROUND_HALF_UP))

        self.full_clean()

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

    def clean(self):
        errors = {}

        if self.tipo == "ingredientes":
            self.tipo = "ingrediente"

        if not self.familia_id and self.categoria_id:
            self.familia = self.categoria.familia

        familia_clave = self.familia.clave if self.familia_id else None
        if familia_clave:
            allowed = {
                FamiliaProducto.Clave.INGREDIENTES: {"ingrediente"},
                FamiliaProducto.Clave.BEBIDAS: {"bebida"},
                FamiliaProducto.Clave.EMPANADAS: {"empanada", "producto_final"},
                FamiliaProducto.Clave.OTROS: {"producto_final"},
            }
            permitted = allowed.get(familia_clave, set())
            if self.tipo and self.tipo not in permitted:
                errors["tipo"] = [
                    "El tipo de producto no coincide con la familia seleccionada."
                ]

        if self.categoria_id and self.familia_id and self.categoria.familia_id != self.familia_id:
            errors["categoria"] = ["La categoría pertenece a otra familia."]

        required_por_familia = {
            FamiliaProducto.Clave.INGREDIENTES: ["unidad_media", "stock_actual", "stock_minimo"],
            FamiliaProducto.Clave.BEBIDAS: ["unidad_media", "stock_actual", "stock_minimo"],
            FamiliaProducto.Clave.EMPANADAS: ["unidad_media", "stock_actual", "stock_minimo"],
            FamiliaProducto.Clave.OTROS: ["unidad_media", "stock_actual", "stock_minimo"],
        }
        required_fields = required_por_familia.get(familia_clave, [])
        for field in required_fields:
            if getattr(self, field) is None:
                errors[field] = ["Este campo es obligatorio para la familia seleccionada."]

        numeric_fields = [
            "precio",
            "costo",
            "stock_actual",
            "stock_minimo",
            "impuesto",
            "descuento_base",
            "stock_seguridad",
            "nivel_reorden",
            "merma_porcentaje",
            "rendimiento_receta",
            "costo_estandar",
            "costo_promedio",
        ]
        for field in numeric_fields:
            value = getattr(self, field)
            if value is not None and value < 0:
                errors[field] = ["No se permiten valores negativos."]

        if self.unidad_empaque is not None and self.unidad_empaque < 1:
            errors["unidad_empaque"] = ["Debe ser al menos 1."]

        if errors:
            raise ValidationError(errors)


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

    OPERACION_VENTA = "venta"
    OPERACION_COMPRA = "compra"
    OPERACION_DEVOLUCION = "devolucion"
    OPERACION_AJUSTE = "ajuste"
    OPERACION_REORDEN = "reorden"
    OPERACION_ELIMINACION = "eliminacion"
    OPERACION_CHOICES = [
        (OPERACION_VENTA, "Venta"),
        (OPERACION_COMPRA, "Compra"),
        (OPERACION_DEVOLUCION, "Devolución"),
        (OPERACION_AJUSTE, "Ajuste manual"),
        (OPERACION_REORDEN, "Reorden automático"),
        (OPERACION_ELIMINACION, "Eliminación de producto"),
    ]
    TIPO_CHOICES = [
        ("entrada", "Entrada"),
        ("salida", "Salida"),
    ]

    producto = models.ForeignKey("Producto", null=True, on_delete=models.SET_NULL)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    fecha = models.DateTimeField(auto_now_add=True)
    motivo = models.CharField(max_length=100)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    operacion_tipo = models.CharField(
        max_length=30, choices=OPERACION_CHOICES, null=True, blank=True
    )
    venta = models.ForeignKey(
        "core.Venta", null=True, blank=True, on_delete=models.SET_NULL, related_name="movimientos"
    )
    compra = models.ForeignKey(
        "core.Compra", null=True, blank=True, on_delete=models.SET_NULL, related_name="movimientos"
    )
    devolucion = models.ForeignKey(
        "core.DevolucionProducto",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="movimientos",
    )

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
    cantidad_descartada = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    cantidad_descartada = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    costo_unitario = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    ingredientes = models.ManyToManyField(
        LoteMateriaPrima,
        through="UsoLoteMateriaPrima",
        related_name="lotes_finales",
    )

    def __str__(self):
        return f"{self.codigo} - {self.producto.nombre}"
    
    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        base_cost = self.producto.costo if self.producto and self.producto.costo is not None else self.costo_unitario
        if base_cost is None:
            base_cost = 0
        self.costo_unitario = Decimal(str(base_cost)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)

    @property
    def costo_unitario_restante(self):
        """Costo por unidad del lote de producto final."""
        if self.costo_unitario is not None:
            return self.costo_unitario
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