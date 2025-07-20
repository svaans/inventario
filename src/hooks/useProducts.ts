import { useQuery } from "@tanstack/react-query";
import { translateCategory } from "../utils/categoryTranslations";

export interface Product {
  id: number;
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
  unidades_posibles?: number | null;
  ingredientes?: { ingrediente: number; ingrediente_nombre: string; cantidad_requerida: number; unidad: string }[];
}

interface ProductoAPI {
  id: number;
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

      const url = `/api/productos/?${params.toString()}`;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to fetch products", res.status, text);
        throw new Error("Failed to fetch products");
      }
      const data = await res.json();
      const productos = data.results ?? data;
      return productos.map((p: ProductoAPI) => ({
        id: p.id,
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
        unidades_posibles: p.unidades_posibles ?? null,
        ingredientes: p.ingredientes ?? [],
      }));
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}