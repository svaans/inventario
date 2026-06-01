import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface HourActivity {
  hour: string;
  value: number;
}

export function useInventoryActivity() {
  return useQuery<HourActivity[]>({
    queryKey: ["inventory-activity"],
    queryFn: async () => {
      const res = await apiFetch("/api/inventory-activity/", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch inventory activity");
      }
      const data = await res.json();
      return data as HourActivity[];
    },
    initialData: [],
    refetchInterval: 60000,
  });
}