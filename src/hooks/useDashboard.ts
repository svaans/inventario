import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface DashboardData {
  sales_today: number;
  sales_week: number;
  total_products: number;
  low_stock: number;
  out_stock: number;
  inventory_value: number;
  production_today: number;
  fixed_costs: number;
  variable_costs: number;
  operational_costs: number;
  non_operational_costs: number;
  non_operational_percent: number;
  break_even: number | null;
  top_products: { producto__nombre: string; total_vendido: number }[];
  week_sales: { day: string; total: number }[];
  alerts: { nombre: string; stock_actual: number; stock_minimo: number }[];
  reorder_suggestions: {
    producto: number;
    nombre: string;
    proveedor: number | null;
    proveedor_nombre?: string | null;
    cantidad: number;
  }[];
  pending_purchases: number;
  last_updated: string;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await apiFetch("/api/dashboard/", {
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