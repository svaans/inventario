from django.contrib import admin
from django.db import models
from .models import (
    Categoria, Producto, Proveedor, Compra, DetalleCompra,
    Cliente, Venta, DetallesVenta, Balance, Transaccion
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
    list_display = ('nombre', 'tipo', 'categoria', 'stock_actual', 'stock_minimo', 'unidad_media')
    list_filter = ('tipo', 'categoria', StockBajoFilter)
    search_fields = ('nombre',)

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    search_fields = ('nombre_categoria',)

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



