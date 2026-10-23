import { normalizeBarcode } from "./productLookup.js";

const MAX_STOCK_QUANTITY = 2147483647;

export function parseStockQuantity(value, fieldLabel) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) {
    throw new Error(`${fieldLabel} deve ser um número inteiro maior ou igual a zero.`);
  }
  const quantity = Number(text);
  if (!Number.isSafeInteger(quantity) || quantity > MAX_STOCK_QUANTITY) {
    throw new Error(`${fieldLabel} ultrapassa o limite suportado.`);
  }
  return quantity;
}

export function buildProductPayload(form) {
  return {
    ...form,
    nome: form.nome.trim(),
    codigoReferencia: form.codigoReferencia.trim(),
    codigoBarras: normalizeBarcode(form.codigoBarras),
    valorCusto: Number(form.valorCusto),
    precoVarejo: Number(form.precoVarejo),
    precoRevenda: Number(form.precoRevenda),
    quantidadeEstoque: parseStockQuantity(form.quantidadeEstoque, "A quantidade em estoque"),
    estoqueMinimo: parseStockQuantity(form.estoqueMinimo, "O estoque mínimo")
  };
}
