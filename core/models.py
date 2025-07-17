from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
#categorias de productos

class Categoria(models.Model):
    nombre_categoria = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre_categoria
    

# productos finales e ingredientes
class Producto(models.Model):
    TIPO_CHOICES = [
        ('empanada', 'Empanada'),
        ('ingredientes', 'Ingredientes'),

    ]

    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, default="")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    es_ingrediente = models.BooleanField(default=False)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2)
    unidad_media = models.CharField(max_length=50)
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

    producto = models.ForeignKey(
        Producto, related_name="historial", on_delete=models.CASCADE
    )
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    costo = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self) -> str:
        return f"{self.producto.nombre} - {self.fecha:%Y-%m-%d}"

    
# proveedores
class Proveedor(models.Model):
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200)

    def __str__(self):
        return self.nombre

    

# compras
class Compra(models.Model):
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    fecha = models.DateField()
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Compra {self.id} - {self.fecha}"
    
    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.total is not None:
            self.total = Decimal(str(self.total)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)


# detalles de la compra
class DetalleCompra(models.Model):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.cantidad is not None:
            self.cantidad = Decimal(str(self.cantidad)).quantize(quant, ROUND_HALF_UP)
        if self.precio_unitario is not None:
            self.precio_unitario = Decimal(str(self.precio_unitario)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)


# clientes
class Cliente(models.Model):
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100)
    email = models.EmailField(null=True, blank=True)
    direccion = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return self.nombre
    

# ventas
class Venta(models.Model):
    fecha = models.DateField()
    total = models.DecimalField(max_digits=10, decimal_places=2)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Venta {self.id} - {self.fecha}"
    
    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.total is not None:
            self.total = Decimal(str(self.total)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)
    

# detalles de la venta
class DetallesVenta(models.Model):
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    lote = models.CharField(max_length=50, null=True, blank=True)
    lote_final = models.ForeignKey(
        'LoteProductoFinal', null=True, blank=True, on_delete=models.SET_NULL
    )

    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.cantidad is not None:
            self.cantidad = Decimal(str(self.cantidad)).quantize(quant, ROUND_HALF_UP)
        if self.precio_unitario is not None:
            self.precio_unitario = Decimal(str(self.precio_unitario)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)


class ComposicionProducto(models.Model):
    producto_final = models.ForeignKey(
        Producto, related_name="ingredientes", on_delete=models.CASCADE
    )
    ingrediente = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad_requerida = models.FloatField(
        help_text="Cantidad requerida del ingrediente (en gramos, litros, etc.)"
    )
    lote = models.CharField(max_length=50, null=True, blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.producto_final.nombre} -> {self.ingrediente.nombre}"


# balance mensual
class Balance(models.Model):
    mes = models.IntegerField()
    anio = models.IntegerField()
    total_ingresos = models.DecimalField(max_digits=12, decimal_places=2)
    total_egresos = models.DecimalField(max_digits=12, decimal_places=2)
    utilidad = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Balance {self.mes}/{self.anio}"
    
class MovimientoInventario(models.Model):
    TIPO_CHOICES = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
    ]

    producto = models.ForeignKey('Producto', null=True, on_delete=models.SET_NULL)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)
    motivo = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.tipo.title()} - {self.producto.nombre} ({self.cantidad})"



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
    monto = models.DecimalField(max_digits=12, decimal_places=2)
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


class DevolucionProducto(models.Model):
    """Registro de productos devueltos o defectuosos."""

    fecha = models.DateField()
    lote = models.CharField(max_length=50)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    motivo = models.CharField(max_length=200)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
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


class LoteMateriaPrima(models.Model):
    """Lotes de ingredientes o materia prima."""

    codigo = models.CharField(max_length=50, unique=True)
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        limit_choices_to={"es_ingrediente": True},
    )
    fecha_recepcion = models.DateField()
    fecha_vencimiento = models.DateField(default=date.today)
    cantidad_inicial = models.DecimalField(max_digits=10, decimal_places=2)
    cantidad_usada = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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


class LoteProductoFinal(models.Model):
    """Lote producido para un producto final."""

    codigo = models.CharField(max_length=50, unique=True)
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        limit_choices_to={"es_ingrediente": False},
    )
    fecha_produccion = models.DateField()
    cantidad_producida = models.DecimalField(max_digits=10, decimal_places=2)
    cantidad_vendida = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cantidad_devuelta = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    ingredientes = models.ManyToManyField(
        LoteMateriaPrima,
        through="UsoLoteMateriaPrima",
        related_name="lotes_finales",
    )

    def __str__(self):
        return f"{self.codigo} - {self.producto.nombre}"


class UsoLoteMateriaPrima(models.Model):
    """Registro de utilización de un lote de materia prima en un lote final."""

    lote_materia_prima = models.ForeignKey(
        LoteMateriaPrima, related_name="usos", on_delete=models.CASCADE
    )
    lote_producto_final = models.ForeignKey(
        LoteProductoFinal, related_name="usos", on_delete=models.CASCADE
    )
    fecha = models.DateField()
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.lote_materia_prima.codigo} -> {self.lote_producto_final.codigo}"


class MonthlyReport(models.Model):
    """Notas y reporte mensual generado."""

    month = models.IntegerField()
    year = models.IntegerField()
    notes = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("month", "year")

    def __str__(self) -> str:
        return f"{self.month:02d}/{self.year}"


class EventoEspecial(models.Model):
    """Fechas con eventos o festivos que afectan la demanda."""

    fecha = models.DateField(unique=True)
    nombre = models.CharField(max_length=100)
    factor_demanda = models.FloatField(default=1.0)

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
    ventas = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    horas_trabajadas = models.DecimalField(max_digits=5, decimal_places=2, default=0)
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
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    sugerido = models.PositiveIntegerField()
    ajustado = models.PositiveIntegerField()
    real = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("fecha", "producto")
        ordering = ["fecha", "producto"]

    def __str__(self) -> str:
        return f"{self.fecha} {self.producto.nombre}"