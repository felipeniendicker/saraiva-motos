import { apiRequest } from "./httpClient.js";
async function request(path) {
  return apiRequest(path, {}, { defaultMessage: "Não foi possível carregar o relatório." });
}
export function getSalesReport({ startDate = "", endDate = "" } = {}) {
  const params = new URLSearchParams(); if (startDate) params.set("dataInicio", startDate); if (endDate) params.set("dataFim", endDate);
  const query = params.toString(); return request(`/api/relatorios/vendas${query ? `?${query}` : ""}`);
}
export function getTopProductsReport(filters = {}) { return getSalesReport(filters).then((data) => data.produtosMaisVendidos); }
export function getStockReport({ includeInactive = false } = {}) { return request(`/api/relatorios/estoque${includeInactive ? "?incluirInativos=true" : ""}`); }
