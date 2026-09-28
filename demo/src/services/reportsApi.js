const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
async function request(path) {
  const response = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || "Não foi possível carregar o relatório.");
  return body;
}
export function getSalesReport({ startDate = "", endDate = "" } = {}) {
  const params = new URLSearchParams(); if (startDate) params.set("dataInicio", startDate); if (endDate) params.set("dataFim", endDate);
  const query = params.toString(); return request(`/api/relatorios/vendas${query ? `?${query}` : ""}`);
}
export function getTopProductsReport(filters = {}) { return getSalesReport(filters).then((data) => data.produtosMaisVendidos); }
export function getStockReport({ includeInactive = false } = {}) { return request(`/api/relatorios/estoque${includeInactive ? "?incluirInativos=true" : ""}`); }
