import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

export interface CurrentUser {
  username: string;
  groups: string[];
  is_superuser: boolean;
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await apiFetch("/api/me/");
      if (res.status === 401 || res.status === 403) {
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to load current user");
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}