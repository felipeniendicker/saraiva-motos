import { PAYMENT_METHODS, getProductPrice } from "../data/domain.js";
import { createId, normalizeText } from "../utils/formatters.js";

export function toCents(value) {
  return Math.round(Number(value) * 100);
}

export function fromCents(value) {
  return value / 100;
}

function roundMoney(value) {
  return fromCents(toCents(value));
}

function withSubtotal(item) {
  return {
    ...item,
    subtotal: fromCents(toCents(item.precoUnitario) * item.quantidade)
  };
}

export function calculateSaleTotals(items, discount = 0) {
  const subtotalCents = items.reduce(
    (total, item) => total + toCents(item.precoUnitario) * Number(item.quantidade),
    0
  );
  const discountCents = toCents(discount || 0);

  return {
    subtotal: fromCents(subtotalCents),
    desconto: fromCents(discountCents),
    total: fromCents(Math.max(0, subtotalCents - discountCents))
  };
}

export function findProductByCode(products, code) {
  const query = normalizeText(String(code || "").trim());
  if (!query) {
    return { ok: false, message: "Informe um código de barras ou referência." };
  }

  const activeProducts = products.filter((product) => product.ativo);
  const barcodeMatch = activeProducts.find(
    (product) => product.codigoBarras && normalizeText(String(product.codigoBarras)) === query
  );
  if (barcodeMatch) {
    return { ok: true, product: barcodeMatch };
  }

  const referenceMatches = activeProducts.filter(
    (product) => product.codigoReferencia && normalizeText(String(product.codigoReferencia)) === query
  );
  if (referenceMatches.length === 1) {
    return { ok: true, product: referenceMatches[0] };
  }
  if (referenceMatches.length > 1) {
    return { ok: false, message: "Mais de um produto possui essa referência. Use a busca manual." };
  }

  return { ok: false, message: "Produto ativo não encontrado para o código informado." };
}

export function searchActiveProducts(products, search) {
  const query = normalizeText(String(search || "").trim());
  if (!query) return [];

  return products.filter((product) => product.ativo && [
    product.nome,
    product.codigoReferencia,
    product.codigoBarras,
    product.marca,
    product.categoria,
    product.aplicacao
  ].some((value) => normalizeText(String(value || "")).includes(query)));
}

export function searchActiveCustomers(customers, search) {
  const query = normalizeText(String(search || "").trim());
  const compactQuery = query.replace(/[^a-z0-9]/g, "");
  const activeCustomers = customers.filter((customer) => customer.ativo);
  if (!query) return activeCustomers;

  return activeCustomers.filter((customer) => [
    customer.nomeRazaoSocial,
    customer.cpfCnpj,
    customer.telefone
  ].some((value) => {
    const normalizedValue = normalizeText(String(value || ""));
    return normalizedValue.includes(query)
      || (compactQuery && normalizedValue.replace(/[^a-z0-9]/g, "").includes(compactQuery));
  }));
}

export function buildSaleConfirmation({ customer, items, total, paymentMethod }) {
  return {
    customerName: customer?.nomeRazaoSocial || "Consumidor não identificado",
    itemQuantity: items.reduce((sum, item) => sum + Number(item.quantidade || 0), 0),
    total,
    paymentMethod
  };
}

export async function runSingleSubmission(lock, submit) {
  if (lock.current) return { skipped: true };
  lock.current = true;
  try {
    return await submit();
  } finally {
    lock.current = false;
  }
}

export function addProductToCart(items, product, priceType, idFactory = createId) {
  if (!product?.ativo) {
    return { ok: false, items, message: "Este produto está inativo." };
  }
  if (product.quantidadeEstoque <= 0) {
    return { ok: false, items, message: `${product.nome} está sem estoque.` };
  }

  const existing = items.find((item) => item.produtoId === product.id);
  if (existing) {
    if (existing.quantidade >= product.quantidadeEstoque) {
      return { ok: false, items, message: `Estoque máximo disponível: ${product.quantidadeEstoque} unidade(s).` };
    }
    return {
      ok: true,
      items: items.map((item) => item.produtoId === product.id
        ? withSubtotal({ ...item, quantidade: item.quantidade + 1 })
        : item)
    };
  }

  const price = roundMoney(getProductPrice(product, priceType));
  const item = withSubtotal({
    id: idFactory("item"),
    produtoId: product.id,
    codigoProduto: product.codigoReferencia || product.codigoBarras || "",
    descricaoProduto: product.nome,
    quantidade: 1,
    precoOriginal: price,
    precoUnitario: price,
    precoAlteradoManualmente: false
  });

  return { ok: true, items: [...items, item] };
}

export function changeCartItemQuantity(items, product, quantity) {
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    return { ok: false, items, message: "A quantidade deve ser um número inteiro maior que zero." };
  }
  if (parsedQuantity > product.quantidadeEstoque) {
    return { ok: false, items, message: `Estoque máximo disponível: ${product.quantidadeEstoque} unidade(s).` };
  }

  return {
    ok: true,
    items: items.map((item) => item.produtoId === product.id
      ? withSubtotal({ ...item, quantidade: parsedQuantity })
      : item)
  };
}

export function changeCartItemPrice(items, productId, price) {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return { ok: false, items, message: "O preço praticado não pode ser negativo." };
  }

  return {
    ok: true,
    items: items.map((item) => item.produtoId === productId
      ? withSubtotal({
          ...item,
          precoUnitario: roundMoney(parsedPrice),
          precoAlteradoManualmente: true
        })
      : item)
  };
}

export function repriceCart(items, products, priceType) {
  const productMap = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = productMap.get(item.produtoId);
    if (!product) return item;
    const originalPrice = roundMoney(getProductPrice(product, priceType));
    return withSubtotal({
      ...item,
      precoOriginal: originalPrice,
      precoUnitario: item.precoAlteradoManualmente ? item.precoUnitario : originalPrice
    });
  });
}

export function getNextSaleSequence(sales, storedSequence) {
  const highestNumber = sales.reduce((highest, sale) => {
    const parsed = Number(String(sale.numeroVenda || "").replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);
  const stored = Number(storedSequence);
  return Math.max(Number.isInteger(stored) && stored > 0 ? stored : 1, highestNumber + 1);
}

export function completeSale(database, draft, options = {}) {
  const idFactory = options.idFactory || createId;
  const now = options.now || new Date().toISOString();
  const items = draft.itens || [];

  if (items.length === 0) {
    return { ok: false, message: "Adicione pelo menos um produto ao carrinho." };
  }
  if (!PAYMENT_METHODS.includes(draft.formaPagamento)) {
    return { ok: false, message: "Selecione uma forma de pagamento." };
  }

  const customer = draft.clienteId
    ? database.customers.find((item) => item.id === draft.clienteId)
    : null;
  if (draft.clienteId && !customer) {
    return { ok: false, message: "O cliente selecionado não foi encontrado." };
  }

  const productMap = new Map(database.products.map((product) => [product.id, product]));
  const productIds = new Set();
  for (const item of items) {
    const product = productMap.get(item.produtoId);
    if (productIds.has(item.produtoId)) {
      return { ok: false, message: `${item.descricaoProduto} aparece mais de uma vez no carrinho.` };
    }
    productIds.add(item.produtoId);
    if (!product?.ativo) {
      return { ok: false, message: `${item.descricaoProduto} não está disponível para venda.` };
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
      return { ok: false, message: `Quantidade inválida para ${item.descricaoProduto}.` };
    }
    if (!Number.isFinite(item.precoUnitario) || item.precoUnitario < 0) {
      return { ok: false, message: `Preço inválido para ${item.descricaoProduto}.` };
    }
    if (!Number.isFinite(item.precoOriginal) || item.precoOriginal < 0) {
      return { ok: false, message: `Preço original inválido para ${item.descricaoProduto}.` };
    }
    if (item.quantidade > product.quantidadeEstoque) {
      return { ok: false, message: `Estoque insuficiente para ${item.descricaoProduto}. Disponível: ${product.quantidadeEstoque}.` };
    }
  }

  const totals = calculateSaleTotals(items, draft.desconto);
  if (!Number.isFinite(Number(draft.desconto)) || totals.desconto < 0) {
    return { ok: false, message: "O desconto não pode ser negativo." };
  }
  if (totals.desconto > totals.subtotal) {
    return { ok: false, message: "O desconto não pode ser maior que o subtotal." };
  }

  const sequence = getNextSaleSequence(database.sales, database.meta?.nextSaleNumber);
  const saleId = idFactory("venda");
  const numeroVenda = `#${String(sequence).padStart(6, "0")}`;
  const saleItems = items.map((item) => ({
    id: item.id || idFactory("item"),
    produtoId: item.produtoId,
    codigoProduto: item.codigoProduto,
    descricaoProduto: item.descricaoProduto,
    quantidade: item.quantidade,
    precoUnitario: roundMoney(item.precoUnitario),
    precoOriginal: roundMoney(item.precoOriginal),
    subtotal: fromCents(toCents(item.precoUnitario) * item.quantidade)
  }));
  const sale = {
    id: saleId,
    numeroVenda,
    clienteId: customer?.id || null,
    clienteNome: customer?.nomeRazaoSocial || null,
    clienteTipo: customer?.tipoCliente || null,
    tipoPrecoUtilizado: draft.tipoPrecoUtilizado,
    itens: saleItems,
    subtotal: totals.subtotal,
    desconto: totals.desconto,
    total: totals.total,
    formaPagamento: draft.formaPagamento,
    status: "CONCLUIDA",
    dataHora: now,
    observacoes: String(draft.observacoes || "").trim()
  };

  const soldQuantities = new Map(saleItems.map((item) => [item.produtoId, item.quantidade]));
  const movements = saleItems.map((item) => {
    const product = productMap.get(item.produtoId);
    return {
      id: idFactory("mov"),
      produtoId: product.id,
      tipo: "SAIDA_VENDA",
      quantidade: item.quantidade,
      estoqueAnterior: product.quantidadeEstoque,
      estoquePosterior: product.quantidadeEstoque - item.quantidade,
      motivo: `Venda ${numeroVenda}`,
      vendaId: saleId,
      dataHora: now
    };
  });

  const nextDatabase = {
    ...database,
    products: database.products.map((product) => soldQuantities.has(product.id)
      ? { ...product, quantidadeEstoque: product.quantidadeEstoque - soldQuantities.get(product.id) }
      : product),
    sales: [sale, ...database.sales],
    stockMovements: [...movements, ...database.stockMovements],
    meta: { ...database.meta, nextSaleNumber: sequence + 1 }
  };

  return { ok: true, database: nextDatabase, sale };
}

export function getSaleCustomerLabel(sale, customers) {
  if (sale.clienteNome) return sale.clienteNome;
  if (!sale.clienteId) return "Venda balcão";
  return customers.find((customer) => customer.id === sale.clienteId)?.nomeRazaoSocial
    || "Cliente não encontrado";
}

export function getSaleReceiptData(sale, customers = []) {
  const currentCustomer = sale.clienteId
    ? customers.find((customer) => customer.id === sale.clienteId)
    : null;

  return {
    id: sale.id,
    numeroVenda: sale.numeroVenda,
    dataHora: sale.dataHora,
    status: sale.status,
    clienteNome: sale.clienteNome
      || currentCustomer?.nomeRazaoSocial
      || (sale.clienteId ? "Cliente não encontrado" : null),
    clienteTipo: sale.clienteTipo || currentCustomer?.tipoCliente || null,
    tipoPrecoUtilizado: sale.tipoPrecoUtilizado,
    formaPagamento: sale.formaPagamento,
    itens: sale.itens.map((item) => ({
      id: item.id,
      descricaoProduto: item.descricaoProduto,
      codigoProduto: item.codigoProduto,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      subtotal: item.subtotal
    })),
    subtotal: sale.subtotal,
    desconto: sale.desconto,
    total: sale.total,
    observacoes: sale.observacoes,
    dataCancelamento: sale.dataCancelamento || null,
    motivoCancelamento: sale.motivoCancelamento || ""
  };
}

export function filterSalesHistory(sales, filters = {}) {
  const search = normalizeText(String(filters.search || "").trim());
  const customerId = filters.customerId || "";
  const status = filters.status || "";
  const dateFrom = filters.dateFrom || "";
  const dateTo = filters.dateTo || "";

  return [...sales]
    .filter((sale) => {
      const saleDate = String(sale.dataHora || "").slice(0, 10);
      return (!search || normalizeText(String(sale.numeroVenda || "")).includes(search))
        && (!customerId || sale.clienteId === customerId)
        && (!status || sale.status === status)
        && (!dateFrom || saleDate >= dateFrom)
        && (!dateTo || saleDate <= dateTo);
    })
    .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
}

export function getCompletedSalesMetrics(sales) {
  const completed = sales.filter((sale) => sale.status === "CONCLUIDA");
  const revenueCents = completed.reduce((total, sale) => total + toCents(sale.total), 0);
  const itemsSold = completed.reduce(
    (total, sale) => total + sale.itens.reduce((itemTotal, item) => itemTotal + item.quantidade, 0),
    0
  );

  return {
    completedSales: completed.length,
    revenue: fromCents(revenueCents),
    itemsSold
  };
}

export function getTopSellingProducts(sales) {
  const totals = new Map();
  sales.filter((sale) => sale.status === "CONCLUIDA").forEach((sale) => {
    sale.itens.forEach((item) => {
      const current = totals.get(item.produtoId) || {
        produtoId: item.produtoId,
        codigoProduto: item.codigoProduto,
        descricaoProduto: item.descricaoProduto,
        quantidade: 0,
        valorTotalCents: 0
      };
      current.quantidade += item.quantidade;
      current.valorTotalCents += toCents(item.subtotal);
      totals.set(item.produtoId, current);
    });
  });

  return [...totals.values()]
    .map(({ valorTotalCents, ...item }) => ({ ...item, valorTotal: fromCents(valorTotalCents) }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export function cancelSale(database, saleId, reason, options = {}) {
  const cancellationReason = String(reason || "").trim();
  if (!cancellationReason) {
    return { ok: false, message: "Informe o motivo do cancelamento." };
  }

  const sale = database.sales.find((item) => item.id === saleId);
  if (!sale) {
    return { ok: false, message: "Venda não encontrada." };
  }
  if (sale.status !== "CONCLUIDA") {
    return { ok: false, message: "Esta venda já está cancelada e não pode ser cancelada novamente." };
  }

  const productMap = new Map(database.products.map((product) => [product.id, product]));
  for (const item of sale.itens) {
    if (!productMap.has(item.produtoId)) {
      return {
        ok: false,
        message: `Não foi possível estornar ${sale.numeroVenda}: o produto ${item.descricaoProduto} não foi encontrado.`
      };
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
      return { ok: false, message: `Quantidade histórica inválida para ${item.descricaoProduto}.` };
    }
  }

  const idFactory = options.idFactory || createId;
  const now = options.now || new Date().toISOString();
  const updatedStocks = new Map(
    database.products.map((product) => [product.id, product.quantidadeEstoque])
  );
  const movements = sale.itens.map((item) => {
    const previousStock = updatedStocks.get(item.produtoId);
    const nextStock = previousStock + item.quantidade;
    updatedStocks.set(item.produtoId, nextStock);
    return {
      id: idFactory("mov"),
      produtoId: item.produtoId,
      tipo: "CANCELAMENTO_VENDA",
      quantidade: item.quantidade,
      estoqueAnterior: previousStock,
      estoquePosterior: nextStock,
      motivo: `Cancelamento da venda ${sale.numeroVenda} - ${cancellationReason}`,
      vendaId: sale.id,
      dataHora: now
    };
  });
  const cancelledSale = {
    ...sale,
    status: "CANCELADA",
    dataCancelamento: now,
    motivoCancelamento: cancellationReason
  };
  const nextDatabase = {
    ...database,
    products: database.products.map((product) => ({
      ...product,
      quantidadeEstoque: updatedStocks.get(product.id)
    })),
    sales: database.sales.map((item) => item.id === sale.id ? cancelledSale : item),
    stockMovements: [...movements, ...database.stockMovements]
  };

  return { ok: true, database: nextDatabase, sale: cancelledSale, movements };
}
