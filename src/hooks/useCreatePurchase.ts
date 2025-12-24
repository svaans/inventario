import { useMutation } from "@tanstack/react-query";
import { ensureCSRFToken, getCSRFToken } from "@/utils/csrf";
import { apiFetch } from "../utils/api";
import type { PurchaseDetail } from "./usePurchases";

export interface CreatePurchasePayload {
  proveedor: number;
  fecha: string;
  detalles: Array<
    Omit<PurchaseDetail, "subtotal" | "producto_nombre"> & {
      subtotal?: number;
    }
  >;
  total?: number;
}

interface PurchaseCreated {
  id: number;
  total: number;
}

export function useCreatePurchase() {
  return useMutation<PurchaseCreated, Error, CreatePurchasePayload>({
    mutationFn: async (payload: CreatePurchasePayload) => {
      await ensureCSRFToken();
      const body = {
        ...payload,
        detalles: payload.detalles.map((d) => ({
          producto: d.producto,
          cantidad: d.cantidad,
          unidad: d.unidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal ?? d.cantidad * d.precio_unitario,
        })),
        total: payload.total ?? payload.detalles.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0),
      };
      const res = await apiFetch("/api/compras/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.status === 403) {
        throw new Error(
          "No tienes permisos para registrar compras. Inicia sesión y verifica que perteneces al grupo de compras o eres administrador."
        );
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Error al registrar la compra.");
      }
      const data = await res.json();
      return {
        id: data.id,
        total: Number(data.total ?? body.total ?? 0),
      };
    },
  });
}