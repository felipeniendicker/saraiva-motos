import { apiRequest } from "./httpClient.js";

export class StockApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "StockApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  return apiRequest(path, options, { errorClass: StockApiError, defaultMessage: "Não foi possível concluir a operação de estoque." });
}

export function addStock(data) {
  return request("/api/estoque/entrada", { method: "POST", body: JSON.stringify(data) });
}

export function adjustStock(data) {
  return request("/api/estoque/ajuste", { method: "POST", body: JSON.stringify(data) });
}

export function removeStock(data) {
  return request("/api/estoque/saida", { method: "POST", body: JSON.stringify(data) });
}

export function listStockMovements({ productId } = {}) {
  const query = productId === undefined || productId === null || productId === ""
    ? ""
    : `?produtoId=${encodeURIComponent(productId)}`;
  return request(`/api/estoque/movimentacoes${query}`);
}

export function listProductMovements(productId) {
  return listStockMovements({ productId });
}
