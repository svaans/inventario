import { useMutation } from "@tanstack/react-query";

export interface SaleItem {
  producto: number;
  cantidad: number;
  precio_unitario: number;
}

export interface CreateSale {
  fecha: string;
  cliente?: number;
  detalles: SaleItem[];
}

export function useCreateSale() {
  return useMutation(async (sale: CreateSale) => {
    const res = await fetch("/api/ventas/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    if (!res.ok) {
      throw new Error("Error al registrar la venta");
    }
    return res.json();
  });
}