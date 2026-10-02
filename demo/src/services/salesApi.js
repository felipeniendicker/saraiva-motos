import { apiRequest } from "./httpClient.js";
export class SalesApiError extends Error { constructor(message, status) { super(message); this.name = "SalesApiError"; this.status = status; } }
async function request(path, options = {}) {
  return apiRequest(path, options, { errorClass: SalesApiError, defaultMessage: "Não foi possível concluir a operação de venda." });
}
export function listSales({ clientId } = {}) {
  const query = clientId === undefined || clientId === null || clientId === ""
    ? ""
    : `?clienteId=${encodeURIComponent(clientId)}`;
  return request(`/api/vendas${query}`);
}
export const getSale = (id) => request(`/api/vendas/${encodeURIComponent(id)}`);
export const createSale = (data) => request("/api/vendas", { method: "POST", body: JSON.stringify(data) });
export const cancelSaleApi = (id, motivo) => request(`/api/vendas/${encodeURIComponent(id)}/cancelar`, { method: "POST", body: JSON.stringify({ motivo }) });
