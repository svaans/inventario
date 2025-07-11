import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface Sale {
  id: number;
  fecha: string;
  total: number;
  cliente: string;
  usuario: string;
}

interface VentaAPI {
  id: number
  fecha: string
  total: string | number
  cliente?: string
  usuario?: string
}

export function useSales() {
  return useQuery<Sale[]>({
    queryKey: ["sales"],
    queryFn: async () => {
      const res = await apiFetch("/api/ventas/", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch sales");
      }
      const data = await res.json();
      return (data.results ?? data).map((v: VentaAPI) => ({
        id: v.id,
        fecha: v.fecha,
        total: parseFloat(String(v.total)),
        cliente: v.cliente ?? "",
        usuario: v.usuario ?? "",
      }));
    },
    initialData: [],
  });
}