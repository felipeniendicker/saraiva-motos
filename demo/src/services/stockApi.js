const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

export class StockApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "StockApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new StockApiError(body?.message || "Não foi possível concluir a operação de estoque.", response.status);
  }
  return body;
}

export function addStock(data) {
  return request("/api/estoque/entrada", { method: "POST", body: JSON.stringify(data) });
}

export function adjustStock(data) {
  return request("/api/estoque/ajuste", { method: "POST", body: JSON.stringify(data) });
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
