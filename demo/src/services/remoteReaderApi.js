import { apiRequest } from "./httpClient.js";

export function createReaderSession() { return apiRequest("/api/leitor/sessoes", { method: "POST" }); }
export function consumeReaderScan(sessionId) {
  return apiRequest(`/api/leitor/sessoes/${encodeURIComponent(sessionId)}/leituras/proxima`);
}
export function closeReaderSession(sessionId) {
  return apiRequest(`/api/leitor/sessoes/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}
export function getRemoteReaderStatus(token) {
  return apiRequest(`/api/leitor/remoto/${encodeURIComponent(token)}`, {}, { includeAuth: false, handleUnauthorized: false });
}
export function sendRemoteScan(token, codigo, eventoId = crypto.randomUUID()) {
  return apiRequest(`/api/leitor/remoto/${encodeURIComponent(token)}/leituras`, {
    method: "POST", body: JSON.stringify({ codigo, eventoId })
  }, { includeAuth: false, handleUnauthorized: false });
}
