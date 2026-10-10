import { getProductPrice } from "../data/domain.js";
import { createId, normalizeText } from "../utils/formatters.js";

const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (value) => value / 100;
const roundMoney = (value) => fromCents(toCents(value));
const withSubtotal = (item) => ({ ...item, subtotal: fromCents(toCents(item.precoUnitario) * item.quantidade) });

export function calculateSaleTotals(items, discountPercentage = 0) {
  const subtotalCents = items.reduce((total, item) => total + toCents(item.precoUnitario) * Number(item.quantidade), 0);
  const percentage = Number(discountPercentage || 0);
  const discountCents = Number.isFinite(percentage)
    ? Math.round(subtotalCents * Math.min(100, Math.max(0, percentage)) / 100)
    : 0;
  return {
    subtotal: fromCents(subtotalCents),
    descontoPercentual: percentage,
    desconto: fromCents(discountCents),
    total: fromCents(Math.max(0, subtotalCents - discountCents))
  };
}

export function getSaleDiscountPercentage(sale) {
  const stored = Number(sale?.descontoPercentual);
  if (sale?.descontoPercentual !== null && sale?.descontoPercentual !== undefined && Number.isFinite(stored)) {
    return stored;
  }
  const subtotal = Number(sale?.subtotal);
  const discount = Number(sale?.desconto);
  if (!Number.isFinite(subtotal) || subtotal <= 0 || !Number.isFinite(discount)) return 0;
  return Math.round((discount / subtotal) * 10000) / 100;
}

export function findProductByCode(products, code) {
  const query = normalizeText(String(code || "").trim());
  if (!query) return { ok: false, message: "Informe um código de barras ou referência." };
  const active = products.filter((product) => product.ativo);
  const barcode = active.find((product) => product.codigoBarras && normalizeText(String(product.codigoBarras)) === query);
  if (barcode) return { ok: true, product: barcode };
  const references = active.filter((product) => product.codigoReferencia && normalizeText(String(product.codigoReferencia)) === query);
  if (references.length === 1) return { ok: true, product: references[0] };
  if (references.length > 1) return { ok: false, message: "Mais de um produto possui essa referência. Use a busca manual." };
  return { ok: false, message: "Produto ativo não encontrado para o código informado." };
}

export function searchActiveProducts(products, search) {
  const query = normalizeText(String(search || "").trim());
  if (!query) return [];
  return products.filter((product) => product.ativo && [product.nome, product.codigoReferencia, product.codigoBarras, product.marca, product.categoria, product.aplicacao]
    .some((value) => normalizeText(String(value || "")).includes(query)));
}

export function searchActiveCustomers(customers, search) {
  const query = normalizeText(String(search || "").trim());
  const compact = query.replace(/[^a-z0-9]/g, "");
  const active = customers.filter((customer) => customer.ativo);
  if (!query) return active;
  return active.filter((customer) => [customer.nomeRazaoSocial, customer.cpfCnpj, customer.telefone].some((value) => {
    const normalized = normalizeText(String(value || ""));
    return normalized.includes(query) || (compact && normalized.replace(/[^a-z0-9]/g, "").includes(compact));
  }));
}

export function buildSaleConfirmation({ customer, items, total, paymentMethod }) {
  return { customerName: customer?.nomeRazaoSocial || "Consumidor não identificado", itemQuantity: items.reduce((sum, item) => sum + Number(item.quantidade || 0), 0), total, paymentMethod };
}

export async function runSingleSubmission(lock, submit) {
  if (lock.current) return { skipped: true };
  lock.current = true;
  try { return await submit(); } finally { lock.current = false; }
}

export function addProductToCart(items, product, priceType, idFactory = createId) {
  if (!product?.ativo) return { ok: false, items, message: "Este produto está inativo." };
  if (product.quantidadeEstoque <= 0) return { ok: false, items, message: `${product.nome} está sem estoque.` };
  const existing = items.find((item) => item.produtoId === product.id);
  if (existing) {
    if (existing.quantidade >= product.quantidadeEstoque) return { ok: false, items, message: `Estoque máximo disponível: ${product.quantidadeEstoque} unidade(s).` };
    return { ok: true, items: items.map((item) => item.produtoId === product.id ? withSubtotal({ ...item, quantidade: item.quantidade + 1 }) : item) };
  }
  const price = roundMoney(getProductPrice(product, priceType));
  return { ok: true, items: [...items, withSubtotal({ id: idFactory("item"), produtoId: product.id, codigoProduto: product.codigoReferencia || product.codigoBarras || "", descricaoProduto: product.nome, quantidade: 1, precoOriginal: price, precoUnitario: price, precoAlteradoManualmente: false })] };
}

export function changeCartItemQuantity(items, product, quantity) {
  const parsed = Number(quantity);
  if (!Number.isInteger(parsed) || parsed < 1) return { ok: false, items, message: "A quantidade deve ser um número inteiro maior que zero." };
  if (parsed > product.quantidadeEstoque) return { ok: false, items, message: `Estoque máximo disponível: ${product.quantidadeEstoque} unidade(s).` };
  return { ok: true, items: items.map((item) => item.produtoId === product.id ? withSubtotal({ ...item, quantidade: parsed }) : item) };
}

export function changeCartItemPrice(items, productId, price) {
  const parsed = Number(price);
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: false, items, message: "O preço praticado não pode ser negativo." };
  return { ok: true, items: items.map((item) => item.produtoId === productId ? withSubtotal({ ...item, precoUnitario: roundMoney(parsed), precoAlteradoManualmente: true }) : item) };
}

export function repriceCart(items, products, priceType) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return items.map((item) => {
    const product = byId.get(item.produtoId);
    if (!product) return item;
    const original = roundMoney(getProductPrice(product, priceType));
    return withSubtotal({ ...item, precoOriginal: original, precoUnitario: item.precoAlteradoManualmente ? item.precoUnitario : original });
  });
}

export function getSaleCustomerLabel(sale, customers) {
  if (sale.clienteNome) return sale.clienteNome;
  if (!sale.clienteId) return "Venda balcão";
  return customers.find((customer) => customer.id === sale.clienteId)?.nomeRazaoSocial || "Cliente não encontrado";
}

export function getSaleReceiptData(sale, customers = []) {
  const currentCustomer = sale.clienteId ? customers.find((customer) => customer.id === sale.clienteId) : null;
  return {
    id: sale.id, numeroVenda: sale.numeroVenda, dataHora: sale.dataHora, status: sale.status,
    clienteNome: sale.clienteNome || currentCustomer?.nomeRazaoSocial || (sale.clienteId ? "Cliente não encontrado" : null),
    clienteTipo: sale.clienteTipo || currentCustomer?.tipoCliente || null,
    tipoPrecoUtilizado: sale.tipoPrecoUtilizado, formaPagamento: sale.formaPagamento,
    itens: sale.itens.map((item) => ({ id: item.id, descricaoProduto: item.descricaoProduto, codigoProduto: item.codigoProduto, quantidade: item.quantidade, precoUnitario: item.precoUnitario, subtotal: item.subtotal })),
    subtotal: sale.subtotal, desconto: sale.desconto, descontoPercentual: getSaleDiscountPercentage(sale), total: sale.total, observacoes: sale.observacoes,
    dataCancelamento: sale.dataCancelamento || null, motivoCancelamento: sale.motivoCancelamento || ""
  };
}

export function filterSalesHistory(sales, filters = {}) {
  const search = normalizeText(String(filters.search || "").trim());
  return [...sales].filter((sale) => {
    const date = String(sale.dataHora || "").slice(0, 10);
    return (!search || normalizeText(String(sale.numeroVenda || "")).includes(search))
      && (!filters.customerId || sale.clienteId === filters.customerId)
      && (!filters.status || sale.status === filters.status)
      && (!filters.dateFrom || date >= filters.dateFrom)
      && (!filters.dateTo || date <= filters.dateTo);
  }).sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
}
