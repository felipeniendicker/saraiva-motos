import { createSeedDatabase } from "../data/seed.js";
import { getNextSaleSequence } from "./sales.js";

const STORAGE_KEY = "motogestao-pro-db";
const DATABASE_VERSION = 5;

function currentTimestamp() {
  return new Date().toISOString();
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeProduct(product) {
  const precoVarejo = asNumber(product.precoVarejo ?? product.salePrice);

  return {
    id: product.id,
    nome: product.nome ?? product.name ?? "",
    codigoReferencia: product.codigoReferencia ?? product.code ?? "",
    codigoBarras: String(product.codigoBarras ?? ""),
    marca: product.marca ?? product.brand ?? "",
    categoria: product.categoria ?? product.category ?? "",
    aplicacao: product.aplicacao ?? product.application ?? "",
    valorCusto: asNumber(product.valorCusto ?? product.costPrice),
    precoVarejo,
    precoRevenda: asNumber(product.precoRevenda, precoVarejo),
    quantidadeEstoque: asNumber(product.quantidadeEstoque ?? product.quantity),
    estoqueMinimo: asNumber(product.estoqueMinimo ?? product.minimumStock),
    observacoes: product.observacoes ?? product.notes ?? "",
    ativo: product.ativo ?? true,
    dataCadastro: product.dataCadastro ?? product.createdAt ?? currentTimestamp()
  };
}

function normalizeCustomer(customer) {
  return {
    id: customer.id,
    nomeRazaoSocial: customer.nomeRazaoSocial ?? customer.name ?? "",
    telefone: customer.telefone ?? customer.phone ?? "",
    cpfCnpj: customer.cpfCnpj ?? "",
    tipoCliente: customer.tipoCliente ?? "CLIENTE_COMUM",
    endereco: customer.endereco ?? "",
    observacoes: customer.observacoes ?? customer.notes ?? "",
    ativo: customer.ativo ?? true,
    dataCadastro: customer.dataCadastro ?? customer.createdAt ?? currentTimestamp()
  };
}

function normalizeBike(bike) {
  return {
    id: bike.id,
    clienteId: bike.clienteId ?? bike.customerId ?? "",
    marca: bike.marca ?? bike.brand ?? "",
    modelo: bike.modelo ?? bike.model ?? "",
    ano: bike.ano ?? bike.year ?? "",
    cilindrada: bike.cilindrada ?? "",
    placa: bike.placa ?? bike.plate ?? "",
    observacoes: bike.observacoes ?? bike.notes ?? ""
  };
}

function normalizeMovement(movement) {
  const legacyType = movement.type;
  const tipo = movement.tipo
    ?? (legacyType === "Entrada" ? "ENTRADA" : null)
    ?? (legacyType === "Saída" ? "AJUSTE_SAIDA" : null)
    ?? "AJUSTE_ENTRADA";

  return {
    id: movement.id,
    produtoId: movement.produtoId ?? movement.productId ?? "",
    tipo,
    quantidade: asNumber(movement.quantidade ?? movement.quantity),
    estoqueAnterior: movement.estoqueAnterior == null ? null : asNumber(movement.estoqueAnterior),
    estoquePosterior: movement.estoquePosterior == null ? null : asNumber(movement.estoquePosterior),
    motivo: movement.motivo ?? movement.reason ?? "",
    vendaId: movement.vendaId ?? null,
    dataHora: movement.dataHora ?? (movement.date ? `${movement.date}T00:00:00` : currentTimestamp())
  };
}

function normalizeSaleItem(item) {
  const quantidade = asNumber(item.quantidade ?? item.quantity);
  const precoUnitario = asNumber(item.precoUnitario ?? item.unitPrice);

  return {
    id: item.id ?? "",
    produtoId: item.produtoId ?? item.productId ?? "",
    codigoProduto: item.codigoProduto ?? item.productCode ?? "",
    descricaoProduto: item.descricaoProduto ?? item.productDescription ?? "",
    quantidade,
    precoUnitario,
    precoOriginal: asNumber(item.precoOriginal, precoUnitario),
    subtotal: asNumber(item.subtotal, quantidade * precoUnitario)
  };
}

function normalizeSale(sale) {
  const itens = (sale.itens ?? sale.items ?? []).map(normalizeSaleItem);
  const subtotal = asNumber(
    sale.subtotal,
    itens.reduce((total, item) => total + item.subtotal, 0)
  );
  const desconto = asNumber(sale.desconto ?? sale.discount);

  return {
    id: sale.id,
    numeroVenda: sale.numeroVenda ?? sale.saleNumber ?? "",
    clienteId: sale.clienteId ?? sale.customerId ?? null,
    clienteNome: sale.clienteNome ?? sale.customerName ?? null,
    clienteTipo: sale.clienteTipo ?? sale.customerType ?? null,
    tipoPrecoUtilizado: sale.tipoPrecoUtilizado ?? sale.priceType ?? "VAREJO",
    itens,
    subtotal,
    desconto,
    total: asNumber(sale.total, subtotal - desconto),
    formaPagamento: sale.formaPagamento ?? sale.paymentMethod ?? "OUTRO",
    status: sale.status ?? "CONCLUIDA",
    dataHora: sale.dataHora ?? sale.createdAt ?? currentTimestamp(),
    observacoes: sale.observacoes ?? sale.notes ?? "",
    dataCancelamento: sale.dataCancelamento ?? null,
    motivoCancelamento: sale.motivoCancelamento ?? ""
  };
}

function normalizeDatabase(database) {
  const seed = createSeedDatabase();
  const customers = Array.isArray(database.customers) ? database.customers : seed.customers;
  const bikes = Array.isArray(database.bikes) ? database.bikes : seed.bikes;
  const products = Array.isArray(database.products) ? database.products : seed.products;
  const movements = Array.isArray(database.stockMovements)
    ? database.stockMovements
    : seed.stockMovements;
  const sales = Array.isArray(database.sales) ? database.sales : seed.sales;
  const normalizedSales = sales.map(normalizeSale);

  return {
    ...seed,
    ...database,
    customers: customers.map(normalizeCustomer),
    bikes: bikes.map(normalizeBike),
    products: products.map(normalizeProduct),
    stockMovements: movements.map(normalizeMovement),
    sales: normalizedSales,
    meta: {
      ...seed.meta,
      ...database.meta,
      version: DATABASE_VERSION,
      nextSaleNumber: getNextSaleSequence(normalizedSales, database.meta?.nextSaleNumber)
    }
  };
}

export function loadDatabase() {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const seeded = createSeedDatabase();
    saveDatabase(seeded);
    return seeded;
  }

  try {
    const normalized = normalizeDatabase(JSON.parse(raw));
    saveDatabase(normalized);
    return normalized;
  } catch {
    const seeded = createSeedDatabase();
    saveDatabase(seeded);
    return seeded;
  }
}

export function saveDatabase(database) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

