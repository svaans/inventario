export function getCSRFToken() {
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

export function storeCSRFToken(token: string) {
  if (!token || typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem("csrfToken", token);
}