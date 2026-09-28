const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
export class ClientsApiError extends Error { constructor(message, status) { super(message); this.name = "ClientsApiError"; this.status = status; } }
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ClientsApiError(body?.message || "Não foi possível concluir a operação de cliente.", response.status);
  return body;
}
export function listClients({ includeInactive = false, search = "" } = {}) {
  const params = new URLSearchParams(); if (includeInactive) params.set("incluirInativos", "true"); if (search.trim()) params.set("busca", search.trim());
  const query = params.toString(); return request(`/api/clientes${query ? `?${query}` : ""}`);
}
export const searchClients = (search, options = {}) => listClients({ ...options, search });
export const getClient = (id) => request(`/api/clientes/${encodeURIComponent(id)}`);
export const createClient = (data) => request("/api/clientes", { method: "POST", body: JSON.stringify(data) });
export const updateClient = (id, data) => request(`/api/clientes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });
export const deactivateClient = (id) => request(`/api/clientes/${encodeURIComponent(id)}/desativar`, { method: "PATCH" });
export const reactivateClient = (id) => request(`/api/clientes/${encodeURIComponent(id)}/reativar`, { method: "PATCH" });
export const listClientMotorcycles = (id) => request(`/api/clientes/${encodeURIComponent(id)}/motos`);
export const createMotorcycle = (id, data) => request(`/api/clientes/${encodeURIComponent(id)}/motos`, { method: "POST", body: JSON.stringify(data) });
export const updateMotorcycle = (id, data) => request(`/api/motos/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteMotorcycle = (id) => request(`/api/motos/${encodeURIComponent(id)}`, { method: "DELETE" });
