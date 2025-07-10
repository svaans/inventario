import { useQuery } from "@tanstack/react-query";

export interface CurrentUser {
  username: string;
  groups: string[];
  is_superuser: boolean;
}

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/me/", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Not authenticated");
      }
      return res.json();
    },
  });
}