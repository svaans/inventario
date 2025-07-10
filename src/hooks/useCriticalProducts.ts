import { useQuery } from "@tanstack/react-query";

export interface CriticalProduct {
  id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
}

export function useCriticalProducts() {
  // React Query simplifica la obtención y reintentos automáticos
  // además de permitir refetch periódico para mantener la lista al día.
  return useQuery<CriticalProduct[]>({
    queryKey: ["critical-products"],
    queryFn: async () => {
      const res = await fetch("/api/critical-products/", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch critical products");
      }
    const data = await res.json();
      return data.results ?? data;
    },
    initialData: [],
    refetchInterval: 60000, // actualizar cada minuto
  });
}