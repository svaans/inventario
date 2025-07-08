import { useMutation } from "@tanstack/react-query";
import { getCSRFToken } from "@/utils/csrf";

export function useDeleteProduct() {
  return useMutation(async (id: number) => {
    const res = await fetch(`/api/productos/${id}/`, {
      method: "DELETE",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Error al eliminar producto");
    }
    return true;
  });
}