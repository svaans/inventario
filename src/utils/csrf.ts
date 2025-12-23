import { apiFetch } from "./api";

function readCSRFCookie() {
  if (typeof document === "undefined" || !document.cookie) {
    return null;
  }
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith("csrftoken=")) {
      return decodeURIComponent(cookie.substring("csrftoken=".length));
    }
  }
  return null;
}

export function getCSRFToken() {
  const cookieToken = readCSRFCookie();
  if (cookieToken) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("csrfToken", cookieToken);
    }
    return cookieToken;
  }

  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem("csrfToken");
    if (stored) {
      return stored;
    }
  }
  return "";
}

export function storeCSRFToken(token: string) {
  if (!token || typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem("csrfToken", token);
}

export async function ensureCSRFToken() {
  if (typeof window === "undefined") {
    return;
  }
  const stored = window.sessionStorage.getItem("csrfToken");
  if (stored) {
    return;
  }
  try {
    const res = await apiFetch("/api/csrf/");
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { csrfToken?: string };
    if (data?.csrfToken) {
      storeCSRFToken(data.csrfToken);
    }
  } catch {
    return;
  }
}