from django.contrib import admin
from django.db import models
from .models import (
    Categoria,
    Producto,
    Proveedor,
    Compra,
    DetalleCompra,
    Cliente,
    Venta,
    DetallesVenta,
    HistorialPrecio,
    LoteMateriaPrima,
    LoteProductoFinal,
    UsoLoteMateriaPrima,
    Balance,
    Transaccion,
    GastoRecurrente,
    DevolucionProducto,
    MonthlyReport,
    AuditLog,
    FamiliaProducto,
)

class StockBajoFilter(admin.SimpleListFilter):
    title = 'stock bajo'
    parameter_name = 'stock_bajo'

    def lookups(self, request, model_admin):
        return (
            ('si', 'Solo productos en stock bajo'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'si':
            return queryset.filter(stock_actual__lt=models.F('stock_minimo'))
        return queryset

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'familia', 'categoria', 'stock_actual', 'stock_minimo', 'unidad_media')
    list_filter = ('tipo', 'familia', 'categoria', StockBajoFilter)
    search_fields = ('nombre',)

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    search_fields = ('nombre_categoria',)
    list_display = ("nombre_categoria", "familia")


@admin.register(FamiliaProducto)
class FamiliaProductoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "clave")
    search_fields = ("nombre", "clave")

@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'contacto')
    search_fields = ('nombre',)

@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ('id', 'proveedor', 'fecha', 'total')
    list_filter = ('fecha', 'proveedor')
    date_hierarchy = 'fecha'

@admin.register(DetalleCompra)
class DetalleCompraAdmin(admin.ModelAdmin):
    list_display = ('compra', 'producto', 'cantidad', 'precio_unitario')

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    search_fields = ('nombre',)

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ('id', 'fecha', 'cliente', 'usuario', 'total')
    list_filter = ('fecha', 'usuario')
    search_fields = ('cliente__nombre',)
    date_hierarchy = 'fecha'

@admin.register(DetallesVenta)
class DetallesVentaAdmin(admin.ModelAdmin):
    list_display = ('venta', 'producto', 'cantidad', 'precio_unitario')

@admin.register(Balance)
class BalanceAdmin(admin.ModelAdmin):
    list_display = ('mes', 'anio', 'total_ingresos', 'total_egresos', 'utilidad')
    list_filter = ('anio',)

@admin.register(Transaccion)
class TransaccionAdmin(admin.ModelAdmin):
    list_display = (
        'fecha',
        'monto',
        'tipo',
        'categoria',
        'tipo_costo',
        'revisado',
        'responsable',
    )
    list_filter = ('tipo', 'categoria', 'tipo_costo', 'revisado', 'fecha')


@admin.register(GastoRecurrente)
class GastoRecurrenteAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "categoria",
        "monto",
        "dia_corte",
        "activo",
        "naturaleza",
        "tipo_costo",
        "responsable",
        "ultima_generacion",
    )
    list_filter = ("activo", "naturaleza", "tipo_costo")
    search_fields = ("nombre", "categoria")


@admin.register(DevolucionProducto)
class DevolucionProductoAdmin(admin.ModelAdmin):
    list_display = (
        'fecha',
        'lote_final',
        'producto',
        'cantidad',
        'responsable',
        'reembolso',
        'sustitucion',
        'clasificacion',
    )
    list_filter = ('fecha', 'producto', 'clasificacion')


@admin.register(HistorialPrecio)
class HistorialPrecioAdmin(admin.ModelAdmin):
    list_display = ('producto', 'precio', 'costo', 'fecha')
    list_filter = ('producto', 'fecha')

@admin.register(LoteMateriaPrima)
class LoteMateriaPrimaAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'producto',
        'fecha_recepcion',
        'fecha_vencimiento',
        'cantidad_inicial',
        'cantidad_usada',
        'fecha_agotado',
    )
    list_filter = ('producto', 'fecha_recepcion', 'fecha_vencimiento')


@admin.register(LoteProductoFinal)
class LoteProductoFinalAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'producto',
        'fecha_produccion',
        'cantidad_producida',
        'cantidad_vendida',
        'cantidad_devuelta',
        'cantidad_descartada',
    )
    list_filter = ('producto', 'fecha_produccion')


@admin.register(UsoLoteMateriaPrima)
class UsoLoteMateriaPrimaAdmin(admin.ModelAdmin):
    list_display = (
        'lote_materia_prima',
        'lote_producto_final',
        'fecha',
        'cantidad',
    )
    list_filter = ('fecha',)


@admin.register(MonthlyReport)
class MonthlyReportAdmin(admin.ModelAdmin):
    list_display = ('mes', 'anio', 'creado')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("fecha", "usuario", "accion", "objeto")
    list_filter = ("accion", "tipo_contenido")
    search_fields = ("usuario__username",)

