import logging
from typing import Any
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import transaction, OperationalError
from django.db.models import F
from .utils import (
    consumir_ingrediente_fifo,
    vender_producto_final_fifo,
    crear_factura_para_venta,
    actualizar_balance_por_venta,
)
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
    AjusteInventario,
    Compra,
    DetalleCompra,
    Transaccion,
    GastoRecurrente,
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
    
    def _composiciones_base(
        self,
        ingredientes_data: Any,
    ) -> list[tuple[Producto, Decimal]]:
        if ingredientes_data is not None:
            composiciones = []
            for ing in ingredientes_data:
                if ing.get("lote") or ing.get("activo", True) is False:
                    continue
                composiciones.append(
                    (ing["ingrediente"], Decimal(str(ing["cantidad_requerida"])))
                )
            return composiciones
        if self.instance:
            base_qs = self.instance.ingredientes.filter(activo=True, lote__isnull=True)
            if base_qs.exists():
                return [
                    (c.ingrediente, Decimal(str(c.cantidad_requerida)))
                    for c in base_qs
                ]
            return [
                (c.ingrediente, Decimal(str(c.cantidad_requerida)))
                for c in self.instance.ingredientes.filter(activo=True)
            ]
        return []

    def _unidades_posibles_desde_ingredientes(
        self,
        tipo: str,
        stock_actual: Decimal | None,
        ingredientes_data: Any,
        merma_porcentaje: Decimal | None,
        rendimiento_receta: Decimal | None,
    ) -> int | None:
        if not tipo or tipo.startswith("ingred") or stock_actual is None:
            return None
        composiciones = self._composiciones_base(ingredientes_data)
        if not composiciones:
            return None
        merma = Decimal(str(merma_porcentaje or 0)) / Decimal("100")
        merma_factor = Decimal("1") + merma
        rendimiento = Decimal(str(rendimiento_receta or 1))
        posibles: list[Decimal] = []
        for ingrediente, cantidad_requerida in composiciones:
            if cantidad_requerida <= 0:
                continue
            disponible = Decimal(str(ingrediente.stock_actual or 0))
            divisor = cantidad_requerida * merma_factor
            if divisor <= 0:
                continue
            posibles.append(disponible / divisor)
        base_unidades = min(posibles) if posibles else None
        if base_unidades is None:
            return None
        return int(base_unidades * rendimiento)

    def validate(self, attrs):
        tipo = attrs.get("tipo") or (self.instance.tipo if self.instance else None)
        new_stock = attrs.get("stock_actual")
        previous_stock = Decimal(str(self.instance.stock_actual or 0)) if self.instance else Decimal("0")
        stock_actual = new_stock if new_stock is not None else (self.instance.stock_actual if self.instance else None)
        unidades_posibles = self._unidades_posibles_desde_ingredientes(
            tipo=tipo,
            stock_actual=stock_actual,
            ingredientes_data=attrs.get("ingredientes"),
            merma_porcentaje=attrs.get("merma_porcentaje") or (self.instance.merma_porcentaje if self.instance else None),
            rendimiento_receta=attrs.get("rendimiento_receta") or (self.instance.rendimiento_receta if self.instance else None),
        )
        if unidades_posibles is not None and stock_actual is not None:
            maximo_permitido = Decimal(str(unidades_posibles))
            if self.instance:
                maximo_permitido = max(maximo_permitido, previous_stock)
            if Decimal(str(stock_actual)) > maximo_permitido:
                mensaje = "El stock actual no puede superar las unidades posibles según los ingredientes disponibles."
                if self.instance:
                    mensaje = (
                        "El stock actual no puede ser mayor que el máximo permitido por los ingredientes disponibles."
                    )
                raise serializers.ValidationError({"stock_actual": mensaje})
        return super().validate(attrs)
    
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
        
    def _registrar_ajuste_stock(
        self, producto: Producto, cantidad_antes: Decimal, cantidad_despues: Decimal
    ) -> None:
        if cantidad_despues >= cantidad_antes:
            return
        request = self.context.get("request")
        usuario = (
            request.user
            if request and hasattr(request, "user") and request.user.is_authenticated
            else None
        )
        if usuario is None:
            raise serializers.ValidationError(
                {"stock_actual": "No se pudo registrar el ajuste sin un usuario autenticado."}
            )
        ajuste = AjusteInventario.objects.create(
            producto=producto,
            cantidad_antes=cantidad_antes,
            cantidad_despues=cantidad_despues,
            tipo=AjusteInventario.TIPO_DECREMENTO,
            motivo="Ajuste manual de stock por edición de producto",
            responsable=usuario,
        )
        MovimientoInventario.objects.create(
            producto=producto,
            tipo="salida",
            cantidad=cantidad_antes - cantidad_despues,
            motivo="Ajuste manual de stock",
            usuario=usuario,
            operacion_tipo=MovimientoInventario.OPERACION_AJUSTE,
            ajuste=ajuste,
        )
        
    def _consumir_por_produccion(self, producto: Producto, unidades: Decimal) -> None:
        if unidades <= 0 or producto.tipo.startswith("ingred"):
            return
        composiciones = list(
            producto.ingredientes.filter(activo=True, lote__isnull=True).select_related("ingrediente")
        )
        if not composiciones:
            composiciones = list(
                producto.ingredientes.filter(activo=True).select_related("ingrediente")
            )
        if not composiciones:
            return
        merma = Decimal(str(producto.merma_porcentaje or 0)) / Decimal("100")
        merma_factor = Decimal("1") + merma
        rendimiento = Decimal(str(producto.rendimiento_receta or 1))
        if rendimiento <= 0:
            rendimiento = Decimal("1")
        batches = Decimal(str(unidades)) / rendimiento
        request = self.context.get("request")
        usuario = None
        if request and hasattr(request, "user") and request.user.is_authenticated:
            usuario = request.user
        for comp in composiciones:
            requerido = Decimal(str(comp.cantidad_requerida)) * batches * merma_factor
            try:
                consumir_ingrediente_fifo(comp.ingrediente, requerido)
            except ValueError:
                raise serializers.ValidationError(
                    {
                        "ingredientes": f"Ingrediente insuficiente para producir {producto.nombre}: {comp.ingrediente.nombre}"
                    }
                )
            MovimientoInventario.objects.create(
                producto=comp.ingrediente,
                tipo="salida",
                cantidad=requerido,
                motivo=f"Producción de {producto.nombre}",
                usuario=usuario,
                operacion_tipo=MovimientoInventario.OPERACION_AJUSTE,
            )
        MovimientoInventario.objects.create(
            producto=producto,
            tipo="entrada",
            cantidad=Decimal(str(unidades)),
            motivo="Producción",
            usuario=usuario,
            operacion_tipo=MovimientoInventario.OPERACION_AJUSTE,
        )

    
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
            if producto.tipo in ("empanada", "producto_final"):
                self._consumir_por_produccion(producto, Decimal(str(producto.stock_actual or 0)))
        return producto

    def update(self, instance, validated_data):
        ingredientes_data = validated_data.pop("ingredientes", None)
        with transaction.atomic():
            previous_stock = Decimal(str(instance.stock_actual or 0))
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
            delta = Decimal(str(instance.stock_actual or 0)) - previous_stock
            if delta > 0 and instance.tipo in ("empanada", "producto_final"):
                self._consumir_por_produccion(instance, delta)
            elif delta < 0:
                self._registrar_ajuste_stock(
                    producto=instance,
                    cantidad_antes=previous_stock,
                    cantidad_despues=Decimal(str(instance.stock_actual or 0)),
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
    detalles = DetallesVentaSerializer(many=True, write_only=True)

    class Meta:
        model = Venta
        fields = ["id", "fecha", "cliente", "detalles", "total"]
        read_only_fields = ["id", "total"]

    def create(self, validated_data):
        detalles_data = validated_data.pop("detalles", [])
        request = self.context.get("request")
        if not (request and hasattr(request, "user") and request.user.is_authenticated):
            raise PermissionDenied("Authentication credentials were not provided.")
        usuario = request.user
        try:
            with transaction.atomic():
                total = 0
                locked_items = []
                for det in detalles_data:
                    prod_id = det["producto"]
                    try:
                        producto = Producto.objects.select_for_update(nowait=True).get(id=prod_id)
                    except OperationalError:
                        raise serializers.ValidationError(
                            {
                                "detalles": "Otra operación está usando el inventario en este momento. Intenta nuevamente en unos segundos."
                            }
                        )
                    if producto.tipo.startswith("ingred"):
                        raise serializers.ValidationError(
                            {"detalles": f"No se pueden vender ingredientes ({producto.nombre})."}
                        )
                    cantidad = det["cantidad"]
                    precio = det["precio_unitario"]
                    lote = det.get("lote")
                    if producto.stock_actual < cantidad:
                        raise serializers.ValidationError(
                            {
                                "detalles": (
                                    f"Stock insuficiente para {producto.nombre}. "
                                    f"Disponible: {producto.stock_actual}, solicitado: {cantidad}. "
                                    "Reduce la cantidad o repón inventario antes de vender."
                                )
                            }
                        )
                    if producto.stock_actual - cantidad < producto.stock_minimo:
                        raise serializers.ValidationError(
                            {
                                "detalles": (
                                    f"La venta de {producto.nombre} dejaría el stock por debajo del mínimo. "
                                    f"Disponible: {producto.stock_actual}, mínimo permitido: {producto.stock_minimo}. "
                                    "Ajusta la cantidad o repón stock antes de continuar."
                                )
                            }
                        )
                            
                    locked_items.append(
                        {
                            "producto": producto,
                            "cantidad": cantidad,
                            "precio": precio,
                            "lote": lote,
                        }
                    )
                
                try:
                    venta = Venta.objects.create(usuario=usuario, total=0, **validated_data)
                except OperationalError:
                    raise serializers.ValidationError(
                        {
                            "detalles": "Otra operación está usando el inventario en este momento. Intenta nuevamente en unos segundos."
                        }
                    )
                for item in locked_items:
                    producto = item["producto"]
                    cantidad = item["cantidad"]
                    precio = item["precio"]
                    lote = item["lote"]

                    consumos = []
                    if not producto.tipo.startswith("ingred"):
                        try:
                            consumos = vender_producto_final_fifo(producto, cantidad)
                        except ValueError as exc:
                            raise serializers.ValidationError(
                                {
                                    "detalles": (
                                        f"Stock de lotes insuficiente para {producto.nombre}. "
                                        f"Disponible total: {producto.stock_actual}, solicitado: {cantidad}. "
                                        f"Detalle técnico: {exc}. Revisa los lotes o ajusta la cantidad."
                                    )
                                }
                            )
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
                        raise serializers.ValidationError(
                            {
                                "detalles": "Otra operación está usando el inventario en este momento. Intenta nuevamente en unos segundos."
                            }
                        )
                    if not updated:
                        raise serializers.ValidationError(
                            {
                                "detalles": (
                                    f"El stock de {producto.nombre} cambió durante la venta. "
                                    f"Disponible actual: {producto.stock_actual}, solicitado: {cantidad}. "
                                    "Actualiza la cantidad o repón inventario y vuelve a intentar."
                                )
                            }
                        )
                    producto.refresh_from_db()
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
                        raise serializers.ValidationError(
                            {
                                "detalles": "Otra operación está usando el inventario en este momento. Intenta nuevamente en unos segundos."
                            }
                        )
                    
                venta.total = total
                venta.save()
                # Generar factura y actualizar balance del mes
                crear_factura_para_venta(venta)
                actualizar_balance_por_venta(venta)

            return venta
        except serializers.ValidationError:
            raise
        except Exception:
            logging.exception(
                "Unexpected error while creating sale",
                extra={"usuario_id": getattr(usuario, "id", None)},
            )
            raise serializers.ValidationError(
                {
                    "detalles": (
                        "Ocurrió un error interno al registrar la venta. "
                        "Vuelve a intentarlo y, si persiste, contacta al administrador."
                    )
                }
            )
        

class DetalleCompraOutputSerializer(serializers.ModelSerializer):
    """Detalle serializado para respuestas de compras."""

    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    unidad = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = DetalleCompra
        fields = [
            "producto",
            "producto_nombre",
            "cantidad",
            "unidad",
            "precio_unitario",
            "subtotal",
        ]

    def get_unidad(self, obj):
        unidad_media = getattr(obj.producto, "unidad_media", None)
        if unidad_media and unidad_media.abreviatura:
            return unidad_media.abreviatura
        return ""

    def get_subtotal(self, obj):
        return obj.cantidad * obj.precio_unitario


class DetalleCompraInputSerializer(serializers.Serializer):
    """Detalle de compra usado al crear compras vía API."""

    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)
    unidad = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, attrs):
        if attrs["cantidad"] <= 0 or attrs["precio_unitario"] <= 0:
            raise serializers.ValidationError("Cantidad y precio deben ser mayores a 0.")
        return attrs


class CompraSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura para compras."""

    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)
    detalles = DetalleCompraOutputSerializer(many=True, source="detallecompra_set", read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Compra
        fields = ["id", "proveedor", "proveedor_nombre", "fecha", "total", "detalles"]


class CompraCreateSerializer(serializers.ModelSerializer):
    """Serializer para registrar compras y actualizar inventario."""

    detalles = DetalleCompraInputSerializer(many=True, write_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Compra
        fields = ["id", "proveedor", "fecha", "detalles", "total"]

    def validate_detalles(self, value):
        if not value:
            raise serializers.ValidationError("Agrega al menos un detalle de compra.")
        return value

    def create(self, validated_data):
        detalles_data = validated_data.pop("detalles", [])
        request = self.context.get("request")
        if not (request and hasattr(request, "user") and request.user.is_authenticated):
            raise PermissionDenied("Debes iniciar sesión para registrar compras.")

        usuario = request.user
        proveedor = validated_data.get("proveedor")
        proveedor_id = proveedor.id if proveedor else None
        with transaction.atomic():
            compra = Compra.objects.create(total=0, **validated_data)
            total = Decimal("0")

            for det in detalles_data:
                producto = det["producto"]
                cantidad = det["cantidad"]
                precio_unitario = det["precio_unitario"]

                if producto.proveedor_id is None:
                    raise serializers.ValidationError(
                        {"detalles": f"{producto.nombre} no tiene proveedor asignado."}
                    )
                if proveedor_id and producto.proveedor_id and producto.proveedor_id != proveedor_id:
                    raise serializers.ValidationError(
                        {"detalles": f"{producto.nombre} pertenece a otro proveedor."}
                    )
                producto_locked = Producto.objects.select_for_update().get(id=producto.id)
                DetalleCompra.objects.create(
                    compra=compra,
                    producto=producto_locked,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                )
                Producto.objects.filter(id=producto_locked.id).update(
                    stock_actual=F("stock_actual") + cantidad
                )
                MovimientoInventario.objects.create(
                    producto=producto_locked,
                    tipo="entrada",
                    cantidad=cantidad,
                    motivo="Compra",
                    usuario=usuario,
                    operacion_tipo=MovimientoInventario.OPERACION_COMPRA,
                    compra=compra,
                )
                total += cantidad * precio_unitario

            compra.total = total
            compra.save(update_fields=["total"])
            return compra


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

    naturaleza = serializers.ChoiceField(
        choices=Transaccion.NATURALEZA_CHOICES,
        required=False,
    )

    class Meta:
        model = Transaccion
        fields = [
            "id",
            "fecha",
            "monto",
            "tipo",
            "categoria",
            "operativo",
            "naturaleza",
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
    

class GastoRecurrenteSerializer(serializers.ModelSerializer):
    """Serializer para gastos recurrentes."""

    naturaleza = serializers.ChoiceField(
        choices=Transaccion.NATURALEZA_CHOICES,
        required=False,
    )

    class Meta:
        model = GastoRecurrente
        fields = [
            "id",
            "nombre",
            "categoria",
            "monto",
            "dia_corte",
            "activo",
            "naturaleza",
            "tipo_costo",
            "responsable",
            "ultima_generacion",
        ]
        read_only_fields = ["ultima_generacion"]


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