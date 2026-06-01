import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface PurchaseDetail {
  producto: number;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
  producto_nombre?: string;
}

export interface Purchase {
  id: number;
  proveedor: number;
  proveedor_nombre?: string;
  fecha: string;
  total: number;
  detalles: PurchaseDetail[];
}

interface PurchaseAPI {
  id: number;
  proveedor: number | { id: number; nombre: string };
  proveedor_nombre?: string;
  fecha: string;
  total: string | number;
  detalles?: {
    producto: number;
    producto_nombre?: string;
    cantidad: number | string;
    unidad: string;
    precio_unitario: number | string;
    subtotal: number | string;
  }[];
}

export interface PurchaseFilters {
  proveedor?: string;
  fecha?: string;
}

export function usePurchases(filters: PurchaseFilters = {}) {
  return useQuery<Purchase[]>({
    queryKey: ["purchases", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.proveedor) params.append("proveedor", filters.proveedor);
      if (filters.fecha) params.append("fecha", filters.fecha);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`/api/compras/${query}`);
      if (!res.ok) {
        throw new Error("No se pudieron obtener las compras");
      }
      const data = await res.json();
      return (data.results ?? data).map((purchase: PurchaseAPI) => ({
        id: purchase.id,
        proveedor:
          typeof purchase.proveedor === "object" ? purchase.proveedor.id : Number(purchase.proveedor),
        proveedor_nombre:
          purchase.proveedor_nombre ??
          (typeof purchase.proveedor === "object" ? purchase.proveedor.nombre : undefined),
        fecha: purchase.fecha,
        total: Number(purchase.total ?? 0),
        detalles:
          purchase.detalles?.map((d) => ({
            producto: d.producto,
            producto_nombre: d.producto_nombre,
            cantidad: Number(d.cantidad ?? 0),
            unidad: d.unidad,
            precio_unitario: Number(d.precio_unitario ?? 0),
            subtotal: Number(d.subtotal ?? 0),
          })) ?? [],
      }));
    },
    initialData: [],
    refetchOnWindowFocus: false,
  });
}