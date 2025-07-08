import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCSRFToken } from "@/utils/csrf";
import type { Product } from "./useProducts";

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
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
      return id;
    },
    onSuccess: (id) => {
      // Remove deleted product from any cached lists and refetch
      queryClient.setQueriesData<Product[]>(
        { queryKey: ["products"] },
        (old = []) => old.filter((p) => p.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}