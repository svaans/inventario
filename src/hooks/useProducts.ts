import { useQuery } from "@tanstack/react-query";

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
}

interface ProductoAPI {
  id: number;
  nombre: string;
  categoria: string | number;
  categoria_nombre?: string;
  precio: string | number;
  stock_actual: string | number;
  stock_minimo: string | number;
  unidad_media: string;
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
        category: p.categoria_nombre ?? String(p.categoria),
        price: parseFloat(p.precio),
        cost: 0,
        stock: parseFloat(p.stock_actual),
        minStock: parseFloat(p.stock_minimo),
        unit: p.unidad_media,
      }));
    },
    initialData: [],
  });
}