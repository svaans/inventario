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

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/productos/");
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