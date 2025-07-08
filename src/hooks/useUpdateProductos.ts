import { useMutation } from "@tanstack/react-query";
import { getCSRFToken } from "@/utils/csrf";

export interface UpdateProductPayload {
  id: number;
  stock_actual?: number;
  precio?: number;
  costo?: number;
  stock_minimo?: number;
}

export function useUpdateProduct() {
  return useMutation(async (payload: UpdateProductPayload) => {
    const { id, ...data } = payload;
    const res = await fetch(`/api/productos/${id}/`, {
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
  });
}