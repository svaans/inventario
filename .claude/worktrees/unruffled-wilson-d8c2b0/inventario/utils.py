from core.utils import (
    consumir_ingrediente_fifo,
    calcular_perdidas_devolucion,
    lotes_por_vencer,
    enviar_alertas_vencimiento,
    detectar_faltantes,
    auto_reordenar,
    vender_producto_final_fifo,

)

__all__ = [
    "consumir_ingrediente_fifo",
    "calcular_perdidas_devolucion",
    "lotes_por_vencer",
    "enviar_alertas_vencimiento",
    "detectar_faltantes",
    "auto_reordenar",
    "vender_producto_final_fifo",
]