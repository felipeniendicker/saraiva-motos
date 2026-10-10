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

function mutation(path, data, idempotencyKey) {
  return request(path, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    body: JSON.stringify(data)
  });
}

export function addStock(data, idempotencyKey) {
  return mutation("/api/estoque/entrada", data, idempotencyKey);
}

export function adjustStock(data, idempotencyKey) {
  return mutation("/api/estoque/ajuste", data, idempotencyKey);
}

export function removeStock(data, idempotencyKey) {
  return mutation("/api/estoque/saida", data, idempotencyKey);
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
