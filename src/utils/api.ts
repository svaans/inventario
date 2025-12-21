const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!API_BASE_URL) {
    throw new Error("VITE_BACKEND_URL is not set");
  }
  const trimmedBase = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${trimmedBase}${normalizedPath}`, {
    ...options,
    credentials: "include",
  });
}

export async function fetchCategories() {
  const res = await apiFetch("/api/categorias/");
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchUnits() {
  const res = await apiFetch("/api/unidades/");
  if (!res.ok) {
    throw new Error(`Failed to fetch units: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}