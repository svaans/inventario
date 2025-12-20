from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import transaction, OperationalError
from django.db.models import F
from .utils import consumir_ingrediente_fifo, vender_producto_final_fifo
from .models import (
    Producto,
    UnidadMedida,
    FamiliaProducto,
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
    AuditLog,
)

class CategoriaSerializer(serializers.ModelSerializer):
    """Serializer simple para listar categorías."""

    class Meta:
        model = Categoria
        fields = ["id", "nombre_categoria", "familia"]

class UnidadMedidaSerializer(serializers.ModelSerializer):
    """Serializer para unidades de medida."""

    class Meta:
        model = UnidadMedida
        fields = ["id", "nombre", "abreviatura"]

        

class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para autocompletar clientes."""

    class Meta:
        model = Cliente
        fields = ["id", "nombre"]


class ClienteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["id", "nombre", "contacto", "email", "direccion"]

class CriticalProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ["id", "nombre", "stock_actual", "stock_minimo"]

class ComposicionProductoSerializer(serializers.ModelSerializer):
    ingrediente_nombre = serializers.CharField(source="ingrediente.nombre", read_only=True)
    unidad = serializers.CharField(
        source="ingrediente.unidad_media.abreviatura", read_only=True
    )
    lote = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    activo = serializers.BooleanField(required=False)

    class Meta:
        model = ComposicionProducto
        fields = ["ingrediente", "ingrediente_nombre", "cantidad_requerida", "unidad", "lote", "activo"]

class ProductoSerializer(serializers.ModelSerializer):
    # Validamos la categoría por su clave primaria para evitar errores
    categoria = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.all())
    categoria_nombre = serializers.CharField(source="categoria.nombre_categoria", read_only=True)
    familia = serializers.PrimaryKeyRelatedField(queryset=FamiliaProducto.objects.all(), required=False)
    familia_nombre = serializers.CharField(source="familia.nombre", read_only=True)
    unidad_media = serializers.PrimaryKeyRelatedField(queryset=UnidadMedida.objects.all())
    unidad_media_nombre = serializers.CharField(source="unidad_media.nombre", read_only=True)
    unidad_media_abreviatura = serializers.CharField(source="unidad_media.abreviatura", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)
    ingredientes = ComposicionProductoSerializer(many=True, required=False)
    unidades_posibles = serializers.SerializerMethodField()
    margen_bajo = serializers.SerializerMethodField()
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
            "unidad_media_nombre",
            "unidad_media_abreviatura",
            "categoria",
            "categoria_nombre",
            "familia",
            "familia_nombre",
            "proveedor",
            "proveedor_nombre",
            "ingredientes",
            "unidades_posibles",
            "impuesto",
            "descuento_base",
            "unidad_empaque",
            "fecha_alta",
            "vida_util_dias",
            "fecha_caducidad",
            "activo",
            "control_por_lote",
            "control_por_serie",
            "codigo_barras",
            "stock_seguridad",
            "nivel_reorden",
            "lead_time_dias",
            "merma_porcentaje",
            "rendimiento_receta",
            "costo_estandar",
            "costo_promedio",
            "fecha_costo",
            "almacen_origen",
            "imagen_url",
            "margen_bajo",
        ]
        extra_kwargs = {
            "codigo": {"required": True},
            "nombre": {"required": True},
            "categoria": {"required": True},
            "precio": {"required": True},
            "stock_actual": {"required": False},
            "stock_minimo": {"required": False},
            "unidad_media": {"required": True},
            "proveedor": {"required": False},
            "tipo": {"required": True},
            "impuesto": {"required": False},
            "descuento_base": {"required": False},
            "unidad_empaque": {"required": False},
            "fecha_alta": {"required": False},
            "vida_util_dias": {"required": False},
            "fecha_caducidad": {"required": False},
            "activo": {"required": False},
            "control_por_lote": {"required": False},
            "control_por_serie": {"required": False},
            "codigo_barras": {"required": False},
            "stock_seguridad": {"required": False},
            "nivel_reorden": {"required": False},
            "lead_time_dias": {"required": False},
            "merma_porcentaje": {"required": False},
            "rendimiento_receta": {"required": False},
            "costo_estandar": {"required": False},
            "costo_promedio": {"required": False},
            "fecha_costo": {"required": False},
            "almacen_origen": {"required": False},
            "imagen_url": {"required": False},
            "familia": {"required": False},
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
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        ingredientes = data.get("ingredientes")
        if isinstance(ingredientes, list):
            data["ingredientes"] = [
                ing
                for ing in ingredientes
                if ing.get("activo", True) and not ing.get("lote")
            ]
        return data
    


    def _save_with_validation(self, instance: Producto) -> Producto:
        try:
            instance.save()
            return instance
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

    
    def create(self, validated_data):
        ingredientes_data = validated_data.pop("ingredientes", [])
        with transaction.atomic():
            producto = self._save_with_validation(Producto(**validated_data))
            producto = self._save_with_validation(producto)
            
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
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance = self._save_with_validation(instance)
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
        if obj.tipo.startswith("ingred"):
            return None
        # Solo consideramos la receta por defecto (sin lote asignado) y activa
        comps_qs = obj.ingredientes.all()
        comps = [c for c in comps_qs if c.activo and c.lote is None]
        if not comps:
            return None
        merma = float(obj.merma_porcentaje or 0) / 100
        posibles = [
            float(comp.ingrediente.stock_actual) / (float(comp.cantidad_requerida) * (1 + merma))
            for comp in comps
            if comp.cantidad_requerida > 0
        ]
        base_unidades = min(posibles) if posibles else 0
        rendimiento = float(obj.rendimiento_receta or 1)
        return int(base_unidades * rendimiento) if base_unidades else 0

    def get_margen_bajo(self, obj):
        if obj.costo is None or obj.precio is None:
            return False
        costo = float(obj.costo)
        if costo <= 0:
            return False
        margen = (float(obj.precio) - costo) / costo
        return margen < 0.15


class DetallesVentaSerializer(serializers.Serializer):
    """Detalle simple para crear ventas en paralelo sin validar existencia."""

    producto = serializers.IntegerField()
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)
    lote = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    def to_internal_value(self, data):
        try:
            return super().to_internal_value(data)
        except OperationalError:
            raise serializers.ValidationError(
                {"detalles": "Operacion en curso, intente nuevamente"}
            )


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
                prod_id = det["producto"]
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
                if producto.stock_actual - cantidad < producto.stock_minimo:
                    raise serializers.ValidationError(
                        {
                            "detalles": f"Stock mínimo alcanzado para {producto.nombre}"
                        }
                    )
                locked_ingredientes = {}
                comps = []
                if not producto.tipo.startswith("ingred"):
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

                consumos = []
                if not producto.tipo.startswith("ingred"):
                    try:
                        consumos = vender_producto_final_fifo(producto, cantidad)
                    except ValueError:
                        raise serializers.ValidationError({"detalles": f"Stock de lotes insuficiente para {producto.nombre}"})
                if consumos:
                    for lpf, cant_lote, _ in consumos:
                        DetallesVenta.objects.create(
                            venta=venta,
                            producto=producto,
                            cantidad=cant_lote,
                            precio_unitario=precio,
                            lote=lpf.codigo,
                            lote_final=lpf,
                        )
                else:
                    DetallesVenta.objects.create(
                        venta=venta,
                        producto=producto,
                        cantidad=cantidad,
                        precio_unitario=precio,
                        lote=lote,
                    )
                total += cantidad * precio
                try:
                    updated = Producto.objects.filter(
                        id=producto.id,
                        stock_actual__gte=cantidad,
                    ).update(stock_actual=F("stock_actual") - cantidad)
                except OperationalError:
                    raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                if not updated:
                    raise serializers.ValidationError({"detalles": f"Stock insuficiente para {producto.nombre}"})
                producto.refresh_from_db()
                if not producto.tipo.startswith("ingred"):
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
                                usuario=usuario,
                                operacion_tipo=MovimientoInventario.OPERACION_VENTA,
                                venta=venta,
                            )
                        except OperationalError:
                            raise serializers.ValidationError({"detalles": "Operacion en curso, intente nuevamente"})
                try:
                    MovimientoInventario.objects.create(
                        producto=producto,
                        tipo="salida",
                        cantidad=cantidad,
                        motivo="Venta",
                        usuario=usuario,
                        operacion_tipo=MovimientoInventario.OPERACION_VENTA,
                        venta=venta,
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
    lote_final_codigo = serializers.CharField(source="lote_final.codigo", read_only=True)

    class Meta:
        model = DevolucionProducto
        fields = [
            "id",
            "fecha",
            "lote_final",
            "lote_final_codigo",
            "producto",
            "producto_nombre",
            "motivo",
            "cantidad",
            "responsable",
            "responsable_nombre",
            "reembolso",
            "sustitucion",
            "clasificacion",
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


class AuditLogSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="usuario.username", read_only=True)
    objeto_repr = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "usuario",
            "usuario_nombre",
            "accion",
            "fecha",
            "tipo_contenido",
            "objeto_id",
            "objeto_repr",
        ]

    def get_objeto_repr(self, obj):
        return str(obj.objeto)