export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_BACKEND_URL;
  if (!base) return path;
  const trimmedBase = base.replace(/\/$/, "");
  return `${trimmedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiFetch(input: string, init?: RequestInit) {
  return fetch(apiUrl(input), init);
}