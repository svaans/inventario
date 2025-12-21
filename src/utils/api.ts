import { getCSRFToken } from "./csrf";

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_BASE_URL;

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!API_BASE_URL) {
    throw new Error("VITE_BACKEND_URL is not set");
  }
  const trimmedBase = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const method = options.method?.toUpperCase() ?? "GET";
  const headers = new Headers(options.headers);
  if (unsafeMethods.has(method) && !headers.has("X-CSRFToken")) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }
  return fetch(`${trimmedBase}${normalizedPath}`, {
    ...options,
    headers,
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