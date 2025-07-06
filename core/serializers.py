from rest_framework import serializers
from .models import Producto, Venta, DetallesVenta, MovimientoInventario

class CriticalProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ["id", "nombre", "stock_actual", "stock_minimo"]

class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = "__all__"


class DetallesVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetallesVenta
        fields = ["producto", "cantidad", "precio_unitario"]


class VentaCreateSerializer(serializers.ModelSerializer):
    detalles = DetallesVentaSerializer(many=True)

    class Meta:
        model = Venta
        fields = ["id", "fecha", "cliente", "detalles"]

    def create(self, validated_data):
        detalles_data = validated_data.pop("detalles", [])
        request = self.context.get("request")
        usuario = getattr(request, "user", None)
        venta = Venta.objects.create(usuario=usuario, total=0, **validated_data)
        total = 0
        for det in detalles_data:
            producto = det["producto"]
            cantidad = det["cantidad"]
            precio = det["precio_unitario"]
            DetallesVenta.objects.create(
                venta=venta,
                producto=producto,
                cantidad=cantidad,
                precio_unitario=precio,
            )
            total += cantidad * precio
            producto.stock_actual -= cantidad
            producto.save()
            MovimientoInventario.objects.create(
                producto=producto,
                tipo="salida",
                cantidad=cantidad,
                motivo="Venta",
            )
        venta.total = total
        venta.save()
        return venta


class VentaSerializer(serializers.ModelSerializer):
    cliente = serializers.StringRelatedField()
    usuario = serializers.StringRelatedField()

    class Meta:
        model = Venta
        fields = ["id", "fecha", "total", "cliente", "usuario"]