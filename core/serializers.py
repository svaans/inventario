from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction, OperationalError
from django.db.models import F
from .utils import consumir_ingrediente_fifo
from .models import (
    Producto,
    Venta,
    DetallesVenta,
    MovimientoInventario,
    Categoria,
    Cliente,
    ComposicionProducto,
    Transaccion,
    DevolucionProducto,
    RegistroTurno,
    LoteMateriaPrima,
)

class CategoriaSerializer(serializers.ModelSerializer):
    """Serializer simple para listar categorías."""

    class Meta:
        model = Categoria
        fields = ["id", "nombre_categoria"]

        

class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para autocompletar clientes."""

    class Meta:
        model = Cliente
        fields = ["id", "nombre"]

class CriticalProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ["id", "nombre", "stock_actual", "stock_minimo"]

class ComposicionProductoSerializer(serializers.ModelSerializer):
    ingrediente_nombre = serializers.CharField(source="ingrediente.nombre", read_only=True)
    unidad = serializers.CharField(source="ingrediente.unidad_media", read_only=True)
    lote = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    activo = serializers.BooleanField(required=False)

    class Meta:
        model = ComposicionProducto
        fields = ["ingrediente", "ingrediente_nombre", "cantidad_requerida", "unidad", "lote", "activo"]

class ProductoSerializer(serializers.ModelSerializer):
    # Validamos la categoría por su clave primaria para evitar errores
    categoria = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.all())
    categoria_nombre = serializers.CharField(source="categoria.nombre_categoria", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)
    ingredientes = ComposicionProductoSerializer(many=True, required=False)
    unidades_posibles = serializers.SerializerMethodField()
    class Meta:
        model = Producto
        fields = [
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "tipo",
            "es_ingrediente",
            "precio",
            "costo",
            "stock_actual",
            "stock_minimo",
            "unidad_media",
            "categoria",
            "categoria_nombre",
            "proveedor",
            "proveedor_nombre",
            "ingredientes",
            "unidades_posibles",
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
            "es_ingrediente": {"required": False},
        }

    def validate_nombre(self, value: str) -> str:
        """Ensure product names are unique, ignoring case."""
        qs = Producto.objects.filter(nombre__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "Un producto con este nombre ya existe."
            )
        return value
    
    def create(self, validated_data):
        ingredientes_data = validated_data.pop("ingredientes", [])
        with transaction.atomic():
            producto = Producto.objects.create(**validated_data)
            for ing in ingredientes_data:
                ComposicionProducto.objects.create(
                    producto_final=producto,
                    ingrediente=ing["ingrediente"],
                    cantidad_requerida=ing["cantidad_requerida"],
                    lote=ing.get("lote"),
                    activo=ing.get("activo", True),
                )
        return producto

    def update(self, instance, validated_data):
        ingredientes_data = validated_data.pop("ingredientes", None)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if ingredientes_data is not None:
                lote = None
                if ingredientes_data and isinstance(ingredientes_data[0], dict):
                    lote = ingredientes_data[0].get("lote")
                if lote is None:
                    instance.ingredientes.filter(lote__isnull=True, activo=True).update(activo=False)
                else:
                    instance.ingredientes.filter(lote=lote, activo=True).update(activo=False)
                for ing in ingredientes_data:
                    ComposicionProducto.objects.create(
                        producto_final=instance,
                        ingrediente=ing["ingrediente"],
                        cantidad_requerida=ing["cantidad_requerida"],
                        lote=ing.get("lote"),
                        activo=ing.get("activo", True),
                    )
        return instance

    def get_unidades_posibles(self, obj):
        if obj.es_ingrediente:
            return None
        comps = obj.ingredientes.all()
        if not comps:
            return None
        posibles = [
            float(comp.ingrediente.stock_actual) / float(comp.cantidad_requerida)
            for comp in comps
            if comp.cantidad_requerida > 0
        ]
        return int(min(posibles)) if posibles else 0


class DetallesVentaSerializer(serializers.ModelSerializer):
    lote = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    class Meta:
        model = DetallesVenta
        fields = ["producto", "cantidad", "precio_unitario", "lote"]


class VentaCreateSerializer(serializers.ModelSerializer):
    detalles = DetallesVentaSerializer(many=True)

    class Meta:
        model = Venta
        fields = ["id", "fecha", "cliente", "detalles"]

    def create(self, validated_data):
        detalles_data = validated_data.pop("detalles", [])
        request = self.context.get("request")
        if not (request and hasattr(request, "user") and request.user.is_authenticated):
            raise PermissionDenied("Authentication credentials were not provided.")
        usuario = request.user
        with transaction.atomic():
            total = 0
            locked_items = []
            for det in detalles_data:
                prod_id = det["producto"].id
                try:
                    producto = Producto.objects.select_for_update(nowait=True).get(id=prod_id)
                except OperationalError:
                    raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                cantidad = det["cantidad"]
                precio = det["precio_unitario"]
                lote = det.get("lote")
                if producto.stock_actual < cantidad:
                    raise serializers.ValidationError(
                        {"detalles": "Stock insuficiente para %s" % producto.nombre}
                    )
                
                locked_ingredientes = {}
                comps = []
                if not producto.es_ingrediente:
                    comps = producto.ingredientes.select_related("ingrediente")
                    if lote is None:
                        comps = comps.filter(lote__isnull=True, activo=True)
                    else:
                        comps = comps.filter(lote=lote, activo=True)
                    if not comps.exists():
                        comps = []

                    ing_ids = [c.ingrediente_id for c in comps]
                    if ing_ids:
                        try:
                            for ing in Producto.objects.select_for_update(nowait=True).filter(id__in=ing_ids):
                                locked_ingredientes[ing.id] = ing
                        except OperationalError:
                            raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                        
                    for comp in comps:
                        ing = locked_ingredientes.get(comp.ingrediente_id)
                        if ing is None:
                            try:
                                ing = Producto.objects.select_for_update(nowait=True).get(id=comp.ingrediente_id)
                            except OperationalError:
                                raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                            locked_ingredientes[ing.id] = ing
                        requerido = Decimal(str(comp.cantidad_requerida)) * Decimal(str(cantidad))
                        if ing.stock_actual < requerido:
                            raise serializers.ValidationError(
                                {
                                    "detalles": f"Ingrediente insuficiente para {producto.nombre}: {ing.nombre}"
                                }
                            )
                        
                locked_items.append(
                    {
                        "producto": producto,
                        "cantidad": cantidad,
                        "precio": precio,
                        "lote": lote,
                        "comps": comps,
                        "ings": locked_ingredientes,
                    }
                )

            try:
                venta = Venta.objects.create(usuario=usuario, total=0, **validated_data)
            except OperationalError:
                raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})

            for item in locked_items:
                producto = item["producto"]
                cantidad = item["cantidad"]
                precio = item["precio"]
                lote = item["lote"]
                comps = item["comps"]
                locked_ingredientes = item["ings"]

                DetallesVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=cantidad,
                    precio_unitario=precio,
                    lote=lote,
                )
                total += cantidad * precio
                try:
                    Producto.objects.filter(id=producto.id).update(
                        stock_actual=F("stock_actual") - cantidad
                    )
                except OperationalError:
                    raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                producto.refresh_from_db()
                if producto.stock_actual < 0:
                    Producto.objects.filter(id=producto.id).update(
                        stock_actual=F("stock_actual") + cantidad
                    )
                    raise serializers.ValidationError(
                        {"detalles": f"Stock insuficiente para {producto.nombre}"}
                    )
                if not producto.es_ingrediente:
                    for comp in comps:
                        ing = locked_ingredientes[comp.ingrediente_id]
                        requerido = Decimal(str(comp.cantidad_requerida)) * Decimal(str(cantidad))
                        try:
                            consumir_ingrediente_fifo(ing, requerido)
                        except OperationalError:
                            raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                        except ValueError:
                            raise serializers.ValidationError(
                                {
                                    "detalles": f"Ingrediente insuficiente para {producto.nombre}: {ing.nombre}"
                                }
                            )
                        try:
                            MovimientoInventario.objects.create(
                                producto=ing,
                                tipo="salida",
                                cantidad=requerido,
                                motivo=f"Venta de {producto.nombre}",
                            )
                        except OperationalError:
                            raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                try:
                    MovimientoInventario.objects.create(
                        producto=producto,
                        tipo="salida",
                        cantidad=cantidad,
                        motivo="Venta",
                    )
                except OperationalError:
                    raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                
            venta.total = total
            venta.save()
            
        return venta


class VentaSerializer(serializers.ModelSerializer):
    cliente = serializers.StringRelatedField()
    usuario = serializers.StringRelatedField()

    class Meta:
        model = Venta
        fields = ["id", "fecha", "total", "cliente", "usuario"]


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer para crear empleados del sistema."""

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = get_user_model().objects.create(**validated_data)
        user.set_password(password)
        user.save()
        empleado_group, _ = Group.objects.get_or_create(name="empleado")
        user.groups.add(empleado_group)
        return user


class TransaccionSerializer(serializers.ModelSerializer):
    """Serializer para registrar ingresos y egresos."""

    class Meta:
        model = Transaccion
        fields = [
            "id",
            "fecha",
            "monto",
            "tipo",
            "categoria",
            "operativo",
            "actividad",
            "tipo_costo",
            "revisado",
            "canal",
            "responsable",
            "comprobante",
            "descripcion",
        ]
        read_only_fields = ["tipo_costo", "revisado"]

    def validate(self, attrs):
        if attrs.get("tipo") == "egreso":
            if Transaccion.objects.filter(
                fecha=attrs.get("fecha"),
                monto=attrs.get("monto"),
                tipo="egreso",
                categoria=attrs.get("categoria"),
                responsable=attrs.get("responsable"),
            ).exists():
                raise serializers.ValidationError("Egreso duplicado")
        return attrs


class DevolucionSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    responsable_nombre = serializers.CharField(source="responsable.username", read_only=True)

    class Meta:
        model = DevolucionProducto
        fields = [
            "id",
            "fecha",
            "lote",
            "producto",
            "producto_nombre",
            "motivo",
            "cantidad",
            "responsable",
            "responsable_nombre",
            "reembolso",
            "sustitucion",
        ]


class RegistroTurnoSerializer(serializers.ModelSerializer):
    empleados = serializers.PrimaryKeyRelatedField(
        many=True, queryset=get_user_model().objects.all()
    )
    eficiencia = serializers.SerializerMethodField()

    class Meta:
        model = RegistroTurno
        fields = [
            "id",
            "fecha",
            "turno",
            "empleados",
            "produccion",
            "ventas",
            "horas_trabajadas",
            "productos_defectuosos",
            "devoluciones",
            "observaciones",
            "eficiencia",
        ]

    def get_eficiencia(self, obj) -> float:
        return obj.eficiencia