import { useMutation } from "@tanstack/react-query";
import { getCSRFToken } from "@/utils/csrf";
import { apiFetch } from "../utils/api";

export interface UpdateProductPayload {
  id: number;
  stock_actual?: number;
  precio?: number;
  costo?: number;
  stock_minimo?: number;
  ingredientes?: { ingrediente: number; cantidad_requerida: number }[];
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: async (payload: UpdateProductPayload) => {
      const { id, ...data } = payload;
      const res = await apiFetch(`/api/productos/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al actualizar producto");
      }
      return res.json();
    },
  });
}