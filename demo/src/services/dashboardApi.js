import { apiRequest } from "./httpClient.js";
export async function getDashboard() {
  return apiRequest("/api/dashboard", {}, { defaultMessage: "Não foi possível carregar o dashboard." });
}
