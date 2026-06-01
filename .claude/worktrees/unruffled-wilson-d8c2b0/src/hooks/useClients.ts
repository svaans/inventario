import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface Client {
  id: number;
  nombre: string;
}

export function useClients(search: string) {
  return useQuery<Client[]>({
    queryKey: ["clients", search],
    queryFn: async () => {
      if (!search) return [];
      const res = await apiFetch(`/api/clientes/?search=${encodeURIComponent(search)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch clients");
      }
      const data = await res.json();
      return (data.results ?? data) as Client[];
    },
    initialData: [],
  });
}