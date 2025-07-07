from rest_framework import serializers
from .models import Producto, Venta, DetallesVenta, MovimientoInventario, Categoria


class CategoriaSerializer(serializers.ModelSerializer):
    """Serializer simple para listar categorías."""

    class Meta:
        model = Categoria
        fields = ["id", "nombre_categoria"]

class CriticalProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ["id", "nombre", "stock_actual", "stock_minimo"]

class ProductoSerializer(serializers.ModelSerializer):
    # Validamos la categoría por su clave primaria para evitar errores
    categoria = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.all())
    categoria_nombre = serializers.CharField(source="categoria.nombre_categoria", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)
    class Meta:
        model = Producto
        fields = [
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "tipo",
            "precio",
            "costo",
            "stock_actual",
            "stock_minimo",
            "unidad_media",
            "categoria",
            "categoria_nombre",
            "proveedor",
            "proveedor_nombre",
        ]
        extra_kwargs = {
            "codigo": {"required": True},
            "nombre": {"required": True},
            "categoria": {"required": True},
            "precio": {"required": True},
            "stock_actual": {"required": True},
            "stock_minimo": {"required": True},
            "unidad_media": {"required": True},
            "tipo": {"required": True},
        }


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