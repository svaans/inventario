import { useQuery } from "@tanstack/react-query";

export interface DashboardData {
  sales_today: number;
  sales_week: number;
  total_products: number;
  low_stock: number;
  out_stock: number;
  inventory_value: number;
  production_today: number;
  top_products: { producto__nombre: string; total_vendido: number }[];
  week_sales: { day: string; total: number }[];
  alerts: { nombre: string; stock_actual: number; stock_minimo: number }[];
  last_updated: string;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return res.json();
    },
    staleTime: 60000,
  });
}