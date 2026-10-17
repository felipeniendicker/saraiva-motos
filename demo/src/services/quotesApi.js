import { apiRequest } from "./httpClient.js";

export const listQuotes = () => apiRequest("/api/orcamentos");
export const createQuote = (data) => apiRequest("/api/orcamentos", { method: "POST", body: JSON.stringify(data) });
export const updateQuote = (id, data) => apiRequest(`/api/orcamentos/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });
export const cancelQuote = (id, motivo) => apiRequest(`/api/orcamentos/${encodeURIComponent(id)}/cancelar`, { method: "POST", body: JSON.stringify({ motivo }) });
export const convertQuote = (id, data, key) => apiRequest(`/api/orcamentos/${encodeURIComponent(id)}/converter`, {
  method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(data)
});
