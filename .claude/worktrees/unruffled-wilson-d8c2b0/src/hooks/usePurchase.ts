import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import type { Purchase } from "./usePurchases";

export function usePurchase(id: string | number) {
  return useQuery<Purchase>({
    queryKey: ["purchase", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/compras/${id}/`);
      if (!res.ok) {
        throw new Error("No se pudo cargar la compra");
      }
      const data = await res.json();
      return {
        id: data.id,
        proveedor: typeof data.proveedor === "object" ? data.proveedor.id : Number(data.proveedor),
        proveedor_nombre:
          data.proveedor_nombre ?? (typeof data.proveedor === "object" ? data.proveedor.nombre : undefined),
        fecha: data.fecha,
        total: Number(data.total ?? 0),
        detalles: (data.detalles ?? []).map((d: any) => ({
          producto: d.producto,
          producto_nombre: d.producto_nombre,
          cantidad: Number(d.cantidad ?? 0),
          unidad: d.unidad,
          precio_unitario: Number(d.precio_unitario ?? 0),
          subtotal: Number(d.subtotal ?? 0),
        })),
      };
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}