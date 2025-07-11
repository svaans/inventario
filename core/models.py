from django.db import models
from django.conf import settings
from decimal import Decimal, ROUND_HALF_UP
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
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2)
    unidad_media = models.CharField(max_length=50)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    proveedor = models.ForeignKey('Proveedor', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.nombre
    

# proveedores
class Proveedor(models.Model):
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200)

    def __str__(self):
        return self.nombre
    
    def save(self, *args, **kwargs):
        quant = Decimal("0.01")
        if self.precio is not None:
            self.precio = Decimal(str(self.precio)).quantize(quant, ROUND_HALF_UP)
        if self.costo is not None:
            self.costo = Decimal(str(self.costo)).quantize(quant, ROUND_HALF_UP)
        if self.stock_actual is not None:
            self.stock_actual = Decimal(str(self.stock_actual)).quantize(quant, ROUND_HALF_UP)
        if self.stock_minimo is not None:
            self.stock_minimo = Decimal(str(self.stock_minimo)).quantize(quant, ROUND_HALF_UP)
        super().save(*args, **kwargs)
    

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
