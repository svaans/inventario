import { useQuery } from "@tanstack/react-query";

export interface Sale {
  id: number;
  fecha: string;
  total: number;
  cliente: string;
  usuario: string;
}

export function useSales() {
  return useQuery<Sale[]>({
    queryKey: ["sales"],
    queryFn: async () => {
      const res = await fetch("/api/ventas/");
      if (!res.ok) {
        throw new Error("Failed to fetch sales");
      }
      const data = await res.json();
      return (data.results ?? data).map((v: any) => ({
        id: v.id,
        fecha: v.fecha,
        total: parseFloat(v.total),
        cliente: v.cliente ?? "",
        usuario: v.usuario ?? "",
      }));
    },
    initialData: [],
  });
}