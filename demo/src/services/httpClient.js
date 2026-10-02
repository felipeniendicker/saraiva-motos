import { getAuthToken, notifyUnauthorized } from "./authSession.js";

const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

export async function apiRequest(path, options = {}, config = {}) {
  const { errorClass = Error, defaultMessage = "Não foi possível concluir a operação.", includeAuth = true, handleUnauthorized = true } = config;
  const token = includeAuth ? getAuthToken() : null;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch (_networkError) {
    throw new errorClass(defaultMessage, 0);
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && handleUnauthorized) notifyUnauthorized();
    throw new errorClass(body?.message || defaultMessage, response.status);
  }
  return body;
}
