const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
export class SalesApiError extends Error { constructor(message, status) { super(message); this.name = "SalesApiError"; this.status = status; } }
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new SalesApiError(body?.message || "Não foi possível concluir a operação de venda.", response.status);
  return body;
}
export const listSales = () => request("/api/vendas");
export const getSale = (id) => request(`/api/vendas/${encodeURIComponent(id)}`);
export const createSale = (data) => request("/api/vendas", { method: "POST", body: JSON.stringify(data) });
export const cancelSaleApi = (id, motivo) => request(`/api/vendas/${encodeURIComponent(id)}/cancelar`, { method: "POST", body: JSON.stringify({ motivo }) });
