import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface StockTrend {
  period: string;
  producto: string;
  ingrediente: boolean;
  neto: number;
}

export interface SalesTrend {
  period: string;
  categoria: string;
  total: number;
}

export interface LossTrend {
  period: string;
  loss: number;
}

export interface PriceTrend {
  period: string;
  precio_promedio: number;
}

export interface MonthlyTrends {
  stock: StockTrend[];
  sales: SalesTrend[];
  losses: LossTrend[];
  prices: PriceTrend[];
}

export function useMonthlyTrends(year?: number) {
  return useQuery<MonthlyTrends>({
    queryKey: ["monthly-trends", year],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.append("year", String(year));
      const res = await apiFetch(`/api/monthly-trends/?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch monthly trends");
      }
      return res.json();
    },
  });
}