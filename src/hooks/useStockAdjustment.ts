import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ensureCSRFToken, getCSRFToken } from "@/utils/csrf";
import { apiFetch } from "../utils/api";

export interface StockAdjustmentPayload {
  producto: number;
  cantidad_nueva: number;
  motivo: string;
}

export function useStockAdjustment() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, StockAdjustmentPayload>({
    mutationFn: async (payload) => {
      await ensureCSRFToken();
      const res = await apiFetch("/api/ajuste-inventario/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al registrar el ajuste");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
