import { apiRequest } from "./httpClient.js";

export function getCurrentCash() { return apiRequest("/api/caixas/atual"); }
export function listCashHistory() { return apiRequest("/api/caixas"); }
export function openCash(valorInicial) {
  return apiRequest("/api/caixas", { method: "POST", body: JSON.stringify({ valorInicial }) });
}
export function moveCash(caixaId, data, key = crypto.randomUUID()) {
  return apiRequest(`/api/caixas/${caixaId}/movimentacoes`, {
    method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(data)
  });
}
export function closeCash(caixaId, valorContado) {
  return apiRequest(`/api/caixas/${caixaId}/fechar`, {
    method: "POST", body: JSON.stringify({ valorContado })
  });
}
