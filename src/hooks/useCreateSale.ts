import { useMutation } from "@tanstack/react-query";
import { ensureCSRFToken, getCSRFToken } from "@/utils/csrf";
import { apiFetch } from "../utils/api";

export interface SaleItem {
  producto: number;
  cantidad: number;
  precio_unitario: number;
}

export interface CreateSale {
  fecha: string;
  cliente?: number;
  detalles: SaleItem[];
}

export function useCreateSale() {
  return useMutation<unknown, Error, CreateSale>({
    mutationFn: async (sale: CreateSale) => {
      await ensureCSRFToken();

      const res = await apiFetch("/api/ventas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(sale),
      });
      if (res.status === 403) {
        throw new Error(
          "No tienes permisos para registrar ventas. Inicia sesión y verifica que perteneces al grupo de ventas o eres administrador."
        );
      }
      if (!res.ok) {
        throw new Error("Error al registrar la venta. Inténtalo de nuevo más tarde.");
      }
      return res.json();
    },
  });
}