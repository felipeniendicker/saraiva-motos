export const AUTH_TOKEN_KEY = "saraiva-motos-auth-token";
export const AUTH_UNAUTHORIZED_EVENT = "saraiva-auth-unauthorized";

export function getAuthToken() {
  return globalThis.localStorage?.getItem(AUTH_TOKEN_KEY) || null;
}

export function setAuthToken(token) {
  globalThis.localStorage?.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  globalThis.localStorage?.removeItem(AUTH_TOKEN_KEY);
}

export function notifyUnauthorized() {
  clearAuthToken();
  if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
  }
}
