import { useQuery } from "@tanstack/react-query";
import { translateCategory } from "../utils/categoryTranslations";
import { apiFetch } from "../utils/api";

export interface Product {
  id: number;
  codigo: string;
  name: string;
  description: string;
  categoria: number;
  categoria_nombre: string;
  tipo: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  unitId: number;
  supplier: string;
  impuesto?: number;
  descuento_base?: number;
  unidad_empaque?: number;
  fecha_alta?: string;
  vida_util_dias?: number;
  fecha_caducidad?: string | null;
  activo?: boolean;
  control_por_lote?: boolean;
  control_por_serie?: boolean;
  codigo_barras?: string;
  stock_seguridad?: number;
  nivel_reorden?: number;
  lead_time_dias?: number;
  merma_porcentaje?: number;
  rendimiento_receta?: number;
  costo_estandar?: number;
  costo_promedio?: number;
  fecha_costo?: string | null;
  almacen_origen?: string;
  imagen_url?: string;
  margen_bajo?: boolean;
  unidades_posibles?: number | null;
  ingredientes?: { ingrediente: number; ingrediente_nombre: string; cantidad_requerida: number; unidad: string }[];
}

interface ProductoAPI {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string | number;
  categoria_nombre?: string;
  precio: string | number;
  costo: string | number;
  stock_actual: string | number;
  stock_minimo: string | number;
  unidad_media: number;
  unidad_media_abreviatura: string;
  proveedor: string | number;
  proveedor_nombre?: string;
  tipo: string;
  impuesto?: number | string;
  descuento_base?: number | string;
  unidad_empaque?: number | string;
  fecha_alta?: string;
  vida_util_dias?: number | string;
  fecha_caducidad?: string | null;
  activo?: boolean;
  control_por_lote?: boolean;
  control_por_serie?: boolean;
  codigo_barras?: string;
  stock_seguridad?: number | string;
  nivel_reorden?: number | string;
  lead_time_dias?: number | string;
  merma_porcentaje?: number | string;
  rendimiento_receta?: number | string;
  costo_estandar?: number | string;
  costo_promedio?: number | string;
  fecha_costo?: string | null;
  almacen_origen?: string;
  imagen_url?: string;
  margen_bajo?: boolean;
  unidades_posibles?: number | null;
  ingredientes?: {
    ingrediente: number;
    ingrediente_nombre: string;
    cantidad_requerida: number;
    unidad: string;
  }[];
}

export function useProducts(search = "", codigo?: string) {
  return useQuery<Product[]>({
    // La clave de consulta incluye los filtros para que React Query maneje
    // correctamente el caché y la invalidación.
    queryKey: ["products", search, codigo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (codigo) params.append("codigo", codigo);
      // Solicitar un gran page_size para obtener todos los productos de una sola vez
      params.append("page_size", "1000");

      const res = await apiFetch(`/api/productos/?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to fetch products", res.status, text);
        throw new Error("Failed to fetch products");
      }
      const data = await res.json();
      const productos = data.results ?? data;
      return productos.map((p: ProductoAPI) => ({
        id: p.id,
        codigo: p.codigo,
        name: p.nombre,
        description: p.descripcion ?? "",
        categoria: parseInt(String(p.categoria)),
        categoria_nombre: translateCategory(p.categoria_nombre ?? "Sin categoría"),
        tipo: p.tipo,
        price: parseFloat(String(p.precio)),
        cost: parseFloat(String(p.costo ?? 0)),
        stock: parseFloat(String(p.stock_actual)),
        minStock: parseFloat(String(p.stock_minimo)),
        unit: p.unidad_media_abreviatura,
        unitId: Number(p.unidad_media),
        supplier: p.proveedor_nombre ?? String(p.proveedor),
        impuesto: p.impuesto ? Number(p.impuesto) : 0,
        descuento_base: p.descuento_base ? Number(p.descuento_base) : 0,
        unidad_empaque: p.unidad_empaque ? Number(p.unidad_empaque) : undefined,
        fecha_alta: p.fecha_alta,
        vida_util_dias: p.vida_util_dias ? Number(p.vida_util_dias) : undefined,
        fecha_caducidad: p.fecha_caducidad ?? null,
        activo: p.activo,
        control_por_lote: p.control_por_lote,
        control_por_serie: p.control_por_serie,
        codigo_barras: p.codigo_barras,
        stock_seguridad: p.stock_seguridad ? Number(p.stock_seguridad) : 0,
        nivel_reorden: p.nivel_reorden ? Number(p.nivel_reorden) : undefined,
        lead_time_dias: p.lead_time_dias ? Number(p.lead_time_dias) : undefined,
        merma_porcentaje: p.merma_porcentaje ? Number(p.merma_porcentaje) : 0,
        rendimiento_receta: p.rendimiento_receta ? Number(p.rendimiento_receta) : undefined,
        costo_estandar: p.costo_estandar ? Number(p.costo_estandar) : 0,
        costo_promedio: p.costo_promedio ? Number(p.costo_promedio) : 0,
        fecha_costo: p.fecha_costo ?? null,
        almacen_origen: p.almacen_origen,
        imagen_url: p.imagen_url,
        margen_bajo: p.margen_bajo,
        unidades_posibles: p.unidades_posibles ?? null,
        ingredientes: p.ingredientes ?? [],
      }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}