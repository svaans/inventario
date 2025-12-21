import { apiFetch } from "./api";

function getCSRFToken() {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem("csrfToken");
    if (stored) {
      return stored;
    }
  }
  let cookieValue: string | null = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, "csrftoken=".length) === "csrftoken=") {
        cookieValue = decodeURIComponent(cookie.substring("csrftoken=".length));
        break;
      }
    }
  }
  return cookieValue || "";
}

function storeCSRFToken(token: string) {
  if (!token || typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem("csrfToken", token);
}

async function ensureCSRFToken() {
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

export { ensureCSRFToken, getCSRFToken, storeCSRFToken };