import { apiRequest } from "./httpClient.js";

export function getCompanySettings() {
  return apiRequest("/api/configuracoes/empresa");
}

export function updateCompanySettings(settings) {
  return apiRequest("/api/configuracoes/empresa", {
    method: "PUT",
    body: JSON.stringify(settings)
  });
}
