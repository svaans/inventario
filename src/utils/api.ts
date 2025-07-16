export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_BACKEND_URL;
  if (!base) return path;
  const trimmedBase = base.replace(/\/$/, "");
  return `${trimmedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiFetch(input: string, init?: RequestInit) {
  return fetch(apiUrl(input), init);

}

export async function fetchCategories() {
  const res = await apiFetch("/api/categorias/", { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}