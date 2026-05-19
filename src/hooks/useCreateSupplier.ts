import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCSRFToken } from "@/utils/csrf";
import { apiFetch } from "../utils/api";
import type { Supplier } from "./useSuppliers";

export interface NewSupplier {
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation<Supplier, Error, NewSupplier>({
    mutationFn: async (supplier) => {
      const res = await apiFetch("/api/proveedores/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(supplier),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al registrar proveedor");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
