import { normalizeText } from "../utils/formatters.js";

export function searchOperationalProducts(products, search) {
  const query = normalizeText(String(search || "").trim());
  return products.filter((product) => product.ativo && (!query || [
    product.nome,
    product.codigoReferencia,
    product.codigoBarras,
    product.marca,
    product.categoria,
    product.aplicacao
  ].some((value) => normalizeText(String(value || "")).includes(query))));
}

export function filterStockMovements(movements, filters = {}) {
  return [...movements]
    .filter((movement) => (!filters.productId || String(movement.produtoId) === String(filters.productId))
      && (!filters.type || movement.tipo === filters.type)
      && (!filters.dateFrom || String(movement.dataHora || "").slice(0, 10) >= filters.dateFrom)
      && (!filters.dateTo || String(movement.dataHora || "").slice(0, 10) <= filters.dateTo))
    .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
}

export function getStockStatus(product) {
  if (product.quantidadeEstoque === 0) return "SEM_ESTOQUE";
  if (product.quantidadeEstoque <= product.estoqueMinimo) return "BAIXO";
  return "NORMAL";
}
