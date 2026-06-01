import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";
import { getCSRFToken } from "../utils/csrf";

export interface FinancialTransaction {
  id: number;
  fecha: string;
  descripcion: string;
  tipo: string;
  monto: number;
  categoria?: string;
  referencia?: string;
}

export interface TransactionInput {
  fecha: string;
  descripcion: string;
  tipo: string;
  monto: number;
  categoria?: string;
  referencia?: string;
}

interface TransactionApi {
  id: number;
  fecha?: string;
  created_at?: string;
  descripcion?: string;
  concepto?: string;
  tipo?: string;
  tipo_movimiento?: string;
  monto?: number | string;
  total?: number | string;
  categoria?: string;
  categoria_nombre?: string;
  referencia?: string;
}

const normalizeTransaction = (item: TransactionApi): FinancialTransaction => ({
  id: item.id,
  fecha: item.fecha ?? item.created_at ?? "",
  descripcion: item.descripcion ?? item.concepto ?? "",
  tipo: item.tipo ?? item.tipo_movimiento ?? "",
  monto: Number.parseFloat(String(item.monto ?? item.total ?? 0)),
  categoria: item.categoria ?? item.categoria_nombre,
  referencia: item.referencia,
});

export function useTransactions() {
  return useQuery<FinancialTransaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiFetch("/api/transacciones/", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const data = await res.json();
      const items = data.results ?? data;
      return Array.isArray(items) ? items.map(normalizeTransaction) : [];
    },
    initialData: [],
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation<FinancialTransaction, Error, TransactionInput>({
    mutationFn: async (payload) => {
      const res = await apiFetch("/api/transacciones/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Error al crear la transacción");
      }
      const data = await res.json();
      return normalizeTransaction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation<FinancialTransaction, Error, { id: number; payload: TransactionInput }>({
    mutationFn: async ({ id, payload }) => {
      const res = await apiFetch(`/api/transacciones/${id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Error al actualizar la transacción");
      }
      const data = await res.json();
      return normalizeTransaction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await apiFetch(`/api/transacciones/${id}/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Error al eliminar la transacción");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}