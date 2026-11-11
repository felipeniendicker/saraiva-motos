import { apiRequest } from "./httpClient.js";

export function listOrders({ search, status } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("busca", search);
  if (status) params.set("status", status);
  const query = params.toString();
  return apiRequest(`/api/pedidos${query ? `?${query}` : ""}`);
}

export const convertQuoteToOrder = (quoteId, data) => apiRequest(
  `/api/orcamentos/${encodeURIComponent(quoteId)}/pedido`,
  { method: "POST", body: JSON.stringify(data) }
);

export const changeOrderStatus = (id, data) => apiRequest(`/api/pedidos/${encodeURIComponent(id)}/status`, {
  method: "PUT", body: JSON.stringify(data)
});

export const cancelOrder = (id, reason) => apiRequest(`/api/pedidos/${encodeURIComponent(id)}/cancelar`, {
  method: "POST", body: JSON.stringify({ motivo: reason })
});

export const finalizeOrder = (id, data, key) => apiRequest(`/api/pedidos/${encodeURIComponent(id)}/finalizar`, {
  method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(data)
});
