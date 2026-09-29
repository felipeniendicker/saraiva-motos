import { apiRequest } from "./httpClient.js";

export const BACKEND_API_ENABLED = String(import.meta.env?.VITE_BACKEND_API_ENABLED || "").toLowerCase() === "true";

export class ProductsApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ProductsApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  return apiRequest(path, options, { errorClass: ProductsApiError });
}

export function listProducts({ includeInactive = false, search = "" } = {}) {
  const params = new URLSearchParams();
  if (includeInactive) params.set("incluirInativos", "true");
  if (search.trim()) params.set("busca", search.trim());
  const query = params.toString();
  return request(`/api/produtos${query ? `?${query}` : ""}`);
}

export function getProduct(id) {
  return request(`/api/produtos/${encodeURIComponent(id)}`);
}

export function createProduct(data) {
  return request("/api/produtos", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateProduct(id, data) {
  return request(`/api/produtos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deactivateProduct(id) {
  return request(`/api/produtos/${encodeURIComponent(id)}/desativar`, { method: "PATCH" });
}

export function reactivateProduct(id) {
  return request(`/api/produtos/${encodeURIComponent(id)}/reativar`, { method: "PATCH" });
}

export async function findProductByCode(code) {
  try {
    return await request(`/api/produtos/codigo/${encodeURIComponent(String(code))}`);
  } catch (error) {
    if (error instanceof ProductsApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function lookupProductByCode(code) {
  return request(`/api/produtos/lookup/${encodeURIComponent(String(code).trim())}`);
}

export function searchProducts(term, options = {}) {
  return listProducts({ ...options, search: term });
}
