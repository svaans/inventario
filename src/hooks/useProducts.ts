import { useQuery } from "@tanstack/react-query";

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
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
    queryKey: ["products", search, codigo],
    queryFn: async () => {
      const params: string[] = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (codigo) params.push(`codigo=${encodeURIComponent(codigo)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const res = await fetch(`/api/productos/${query}`);
      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await res.json();
      return (data.results ?? data).map((p: ProductoAPI) => ({
        id: p.id,
        name: p.nombre,
        description: p.descripcion ?? "",
        category: p.categoria_nombre ?? String(p.categoria),
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