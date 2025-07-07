import { useQuery } from "@tanstack/react-query";

export interface Product {
  id: number;
  name: string;
  description: string;
  categoria: number;
  categoria_nombre: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  supplier: string;
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
  unidad_media: string;
  proveedor: string | number;
  proveedor_nombre?: string;
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

      // DRF pagina los resultados; para evitar perder productos entre páginas
      // iteramos hasta que la API no devuelva más enlaces "next".
      let url = `/api/productos/?${params.toString()}`;
      const all: ProductoAPI[] = [];
      while (url) {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await res.json();
        all.push(...(data.results ?? data));
        // "next" puede venir como URL absoluta; la convertimos en ruta relativa.
        url = data.next ? data.next.replace(/^https?:\/\/[^/]+/, "") : "";
      }
      return all.map((p: ProductoAPI) => ({
        id: p.id,
        name: p.nombre,
        description: p.descripcion ?? "",
        categoria: parseInt(String(p.categoria)),
        categoria_nombre: p.categoria_nombre ?? "Sin categoría",
        price: parseFloat(String(p.precio)),
        cost: parseFloat(String(p.costo ?? 0)),
        stock: parseFloat(String(p.stock_actual)),
        minStock: parseFloat(String(p.stock_minimo)),
        unit: p.unidad_media,
        supplier: p.proveedor_nombre ?? String(p.proveedor),
      }));
    },
    initialData: [],
  });
}