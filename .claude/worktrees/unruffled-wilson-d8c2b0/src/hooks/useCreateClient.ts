import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCSRFToken } from "@/utils/csrf";
import { apiFetch } from "../utils/api";

export interface NewClient {
  nombre: string;
  contacto: string;
  email?: string;
  direccion?: string;
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation<{ id: number; nombre: string }, Error, NewClient>({
    mutationFn: async (client) => {
      const res = await apiFetch("/api/clientes/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(client),
      });
      if (!res.ok) {
        throw new Error("Error al registrar cliente");
      }
      return res.json();
    },
    onSuccess: (cli) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}