import { apiRequest } from "./httpClient.js";

export class AuthApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

export function login(email, senha) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha })
  }, {
    errorClass: AuthApiError,
    defaultMessage: "Não foi possível entrar no sistema.",
    includeAuth: false,
    handleUnauthorized: false
  });
}

export function getCurrentUser() {
  return apiRequest("/api/auth/me", {}, {
    errorClass: AuthApiError,
    defaultMessage: "Não foi possível validar a sessão."
  });
}
