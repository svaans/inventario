import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface EvolutionData {
  period: string;
  sales: number | null;
  new_clients: number | null;
  net_income: number;
  profit_margin: number | null;
  growth: number | null;
  projected?: boolean;
}

interface Filters {
  category?: string;
  canal?: string;
  sucursal?: string;
}

export function useBusinessEvolution(period = "month", filters: Filters = {}) {
  return useQuery<EvolutionData[]>({
    queryKey: ["business-evolution", period, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (filters.category) params.append("category", filters.category);
      if (filters.canal) params.append("canal", filters.canal);
      if (filters.sucursal) params.append("sucursal", filters.sucursal);
      const res = await apiFetch(`/api/business-evolution/?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch business evolution data");
      }
      return res.json();
    },
  });
}