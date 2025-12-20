import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface FinancialKpis {
  ingresos?: number;
  egresos?: number;
  balance?: number;
  margen?: number;
  flujo?: number;
}

export interface BalanceEntry {
  label?: string;
  month?: string;
  mes?: string;
  period?: string;
  ingresos?: number;
  egresos?: number;
  balance?: number;
}

export interface RankingEntry {
  name?: string;
  etiqueta?: string;
  total?: number;
  monto?: number;
}

export interface CategoryBreakdownEntry {
  category?: string;
  categoria?: string;
  total?: number;
  monto?: number;
}

export interface FinancialSummary {
  kpis?: FinancialKpis;
  monthly_balance?: BalanceEntry[];
  balance_mensual?: BalanceEntry[];
  historical_balance?: BalanceEntry[];
  balance_historico?: BalanceEntry[];
  ranking?: RankingEntry[];
  ranking_items?: RankingEntry[];
  category_breakdown?: CategoryBreakdownEntry[];
  category_charts?: CategoryBreakdownEntry[];
  last_updated?: string;
  [key: string]: unknown;
}

export function useFinancialSummary() {
  return useQuery<FinancialSummary>({
    queryKey: ["financial-summary"],
    queryFn: async () => {
      const res = await apiFetch("/api/finanzas/resumen/", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch financial summary");
      }
      return res.json();
    },
    staleTime: 60000,
  });
}