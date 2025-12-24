import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface Supplier {
  id: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

interface SupplierAPI {
  id: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await apiFetch("/api/proveedores/");
      if (!res.ok) {
        throw new Error("No se pudieron obtener los proveedores");
      }
      const data = await res.json();
      return (data.results ?? data).map((supplier: SupplierAPI) => ({
        id: supplier.id,
        nombre: supplier.nombre,
        contacto: supplier.contacto,
        telefono: supplier.telefono,
        email: supplier.email,
      }));
    },
    initialData: [],
    refetchOnWindowFocus: false,
  });
}