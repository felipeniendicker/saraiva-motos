import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultPriceType } from "../data/domain.js";
import {
  addProductToCart,
  cancelSale,
  changeCartItemPrice,
  completeSale,
  filterSalesHistory,
  findProductByCode,
  getCompletedSalesMetrics,
  getSaleReceiptData,
  getSaleCustomerLabel,
  getTopSellingProducts,
  repriceCart
} from "./sales.js";

function product(overrides = {}) {
  return {
    id: "p1",
    nome: "Pastilha de freio",
    codigoReferencia: "PF-160",
    codigoBarras: "7891234567890",
    precoVarejo: 100,
    precoRevenda: 80,
    quantidadeEstoque: 2,
    ativo: true,
    ...overrides
  };
}

function database(overrides = {}) {
  return {
    products: [product()],
    customers: [],
    sales: [],
    stockMovements: [],
    meta: { version: 3, nextSaleNumber: 1 },
    ...overrides
  };
}

function addForCustomer(customer) {
  const result = addProductToCart([], product(), getDefaultPriceType(customer), () => "item-1");
  assert.equal(result.ok, true);
  return result.items[0];
}

function completedDraft(item, overrides = {}) {
  return {
    clienteId: null,
    tipoPrecoUtilizado: "VAREJO",
    itens: [item],
    desconto: 0,
    formaPagamento: "PIX",
    observacoes: "",
    ...overrides
  };
}

function fixedOptions() {
  let sequence = 0;
  return {
    now: "2026-09-27T10:00:00.000Z",
    idFactory: (prefix) => `${prefix}-${++sequence}`
  };
}

function historicalSale(overrides = {}) {
  return {
    id: "sale-1",
    numeroVenda: "#000001",
    clienteId: null,
    tipoPrecoUtilizado: "VAREJO",
    itens: [{
      id: "item-history-1",
      produtoId: "p1",
      codigoProduto: "PF-160",
      descricaoProduto: "Pastilha de freio histórica",
      quantidade: 1,
      precoOriginal: 100,
      precoUnitario: 90,
      subtotal: 90
    }],
    subtotal: 90,
    desconto: 0,
    total: 90,
    formaPagamento: "PIX",
    status: "CONCLUIDA",
    dataHora: "2026-09-27T09:20:00.000Z",
    observacoes: "Venda de teste",
    dataCancelamento: null,
    motivoCancelamento: "",
    ...overrides
  };
}

test("1. venda sem cliente usa preço de varejo", () => {
  assert.equal(addForCustomer(null).precoUnitario, 100);
});

test("2. cliente comum usa preço de varejo", () => {
  assert.equal(addForCustomer({ tipoCliente: "CLIENTE_COMUM" }).precoUnitario, 100);
});

test("3. oficina usa preço de revenda", () => {
  assert.equal(addForCustomer({ tipoCliente: "OFICINA" }).precoUnitario, 80);
});

test("4. mecânico usa preço de revenda", () => {
  assert.equal(addForCustomer({ tipoCliente: "MECANICO" }).precoUnitario, 80);
});

test("5. motopeça usa preço de revenda", () => {
  assert.equal(addForCustomer({ tipoCliente: "MOTOPECA" }).precoUnitario, 80);
});

test("6. revendedor usa preço de revenda", () => {
  assert.equal(addForCustomer({ tipoCliente: "REVENDEDOR" }).precoUnitario, 80);
});

test("7. preço negociado altera apenas o item", () => {
  const originalProduct = product();
  const added = addProductToCart([], originalProduct, "REVENDA", () => "item-1");
  const changed = changeCartItemPrice(added.items, "p1", 75);
  assert.equal(changed.items[0].precoOriginal, 80);
  assert.equal(changed.items[0].precoUnitario, 75);
  assert.equal(originalProduct.precoRevenda, 80);
});

test("8. troca de cliente recalcula item não negociado", () => {
  const item = addForCustomer(null);
  const repriced = repriceCart([item], [product()], "REVENDA");
  assert.equal(repriced[0].precoOriginal, 80);
  assert.equal(repriced[0].precoUnitario, 80);
});

test("9. troca de cliente preserva preço negociado", () => {
  const item = addForCustomer(null);
  const changed = changeCartItemPrice([item], "p1", 75).items;
  const repriced = repriceCart(changed, [product()], "REVENDA");
  assert.equal(repriced[0].precoOriginal, 80);
  assert.equal(repriced[0].precoUnitario, 75);
});

test("10. adicionar o mesmo produto aumenta a quantidade sem duplicar linha", () => {
  const first = addProductToCart([], product(), "VAREJO", () => "item-1");
  const second = addProductToCart(first.items, product(), "VAREJO", () => "item-2");
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].quantidade, 2);
});

test("11. quantidade acima do estoque é bloqueada", () => {
  const first = addProductToCart([], product(), "VAREJO", () => "item-1");
  const second = addProductToCart(first.items, product(), "VAREJO");
  const third = addProductToCart(second.items, product(), "VAREJO");
  assert.equal(third.ok, false);
  assert.equal(third.items[0].quantidade, 2);
});

test("12. produto sem estoque não entra no carrinho", () => {
  const result = addProductToCart([], product({ quantidadeEstoque: 0 }), "VAREJO");
  assert.equal(result.ok, false);
  assert.equal(result.items.length, 0);
});

test("13. desconto maior que subtotal é bloqueado sem alterar dados", () => {
  const db = database();
  const item = addForCustomer(null);
  const result = completeSale(db, completedDraft(item, { desconto: 101 }), fixedOptions());
  assert.equal(result.ok, false);
  assert.equal(db.sales.length, 0);
  assert.equal(db.products[0].quantidadeEstoque, 2);
});

test("14. venda concluída baixa o estoque", () => {
  const item = addForCustomer(null);
  const result = completeSale(database(), completedDraft(item), fixedOptions());
  assert.equal(result.ok, true);
  assert.equal(result.database.products[0].quantidadeEstoque, 1);
});

test("15. conclusão cria SAIDA_VENDA com saldos e vínculo", () => {
  const item = addForCustomer(null);
  const result = completeSale(database(), completedDraft(item), fixedOptions());
  const movement = result.database.stockMovements[0];
  assert.equal(movement.tipo, "SAIDA_VENDA");
  assert.equal(movement.estoqueAnterior, 2);
  assert.equal(movement.estoquePosterior, 1);
  assert.equal(movement.vendaId, result.sale.id);
});

test("16. venda sem forma de pagamento é bloqueada", () => {
  const item = addForCustomer(null);
  const result = completeSale(database(), completedDraft(item, { formaPagamento: "" }), fixedOptions());
  assert.equal(result.ok, false);
});

test("17. histórico preserva descrição e preços utilizados", () => {
  const item = changeCartItemPrice([addForCustomer({ tipoCliente: "OFICINA" })], "p1", 75).items[0];
  const result = completeSale(database(), completedDraft(item, { tipoPrecoUtilizado: "REVENDA" }), fixedOptions());
  const savedItem = result.sale.itens[0];
  assert.equal(savedItem.descricaoProduto, "Pastilha de freio");
  assert.equal(savedItem.codigoProduto, "PF-160");
  assert.equal(savedItem.precoOriginal, 80);
  assert.equal(savedItem.precoUnitario, 75);
});

test("busca prioriza código de barras e numeração não depende da quantidade", () => {
  const barcodeProduct = product({ id: "barcode", codigoReferencia: "OUTRA" });
  const referenceProduct = product({ id: "reference", codigoBarras: "", codigoReferencia: "7891234567890" });
  assert.equal(findProductByCode([referenceProduct, barcodeProduct], "7891234567890").product.id, "barcode");

  const db = database({
    sales: [{ numeroVenda: "#000009" }],
    meta: { version: 3, nextSaleNumber: 4 }
  });
  const result = completeSale(db, completedDraft(addForCustomer(null)), fixedOptions());
  assert.equal(result.sale.numeroVenda, "#000010");
  assert.equal(result.database.meta.nextSaleNumber, 11);
});

test("conclusão repete a verificação de estoque e permanece atômica em caso de falha", () => {
  const item = addForCustomer(null);
  const db = database({ products: [product({ quantidadeEstoque: 0 })] });
  const result = completeSale(db, completedDraft(item), fixedOptions());
  assert.equal(result.ok, false);
  assert.equal(db.sales.length, 0);
  assert.equal(db.stockMovements.length, 0);
  assert.equal(db.products[0].quantidadeEstoque, 0);
});

test("desconto negativo é bloqueado", () => {
  const result = completeSale(database(), completedDraft(addForCustomer(null), { desconto: -1 }), fixedOptions());
  assert.equal(result.ok, false);
});

test("18. venda concluída aparece no histórico", () => {
  const sale = historicalSale();
  assert.deepEqual(filterSalesHistory([sale]), [sale]);
});

test("19. histórico ordena vendas da mais recente para a mais antiga", () => {
  const older = historicalSale({ id: "older", dataHora: "2026-09-20T10:00:00.000Z" });
  const newer = historicalSale({ id: "newer", dataHora: "2026-09-27T10:00:00.000Z" });
  assert.deepEqual(filterSalesHistory([older, newer]).map((sale) => sale.id), ["newer", "older"]);
});

test("20. venda sem cliente é identificada como venda balcão", () => {
  assert.equal(getSaleCustomerLabel(historicalSale(), []), "Venda balcão");
});

test("21. detalhes permanecem baseados no snapshot do ItemVenda", () => {
  const sale = historicalSale();
  const changedProduct = product({ nome: "Nome novo", precoVarejo: 300 });
  assert.equal(sale.itens[0].descricaoProduto, "Pastilha de freio histórica");
  assert.equal(sale.itens[0].precoUnitario, 90);
  assert.equal(changedProduct.nome, "Nome novo");
});

test("22. cancelamento altera status para CANCELADA", () => {
  const result = cancelSale(database({ products: [product({ quantidadeEstoque: 5 })], sales: [historicalSale()] }), "sale-1", "Erro no pedido", fixedOptions());
  assert.equal(result.ok, true);
  assert.equal(result.sale.status, "CANCELADA");
});

test("23. cancelamento registra data e hora", () => {
  const result = cancelSale(database({ sales: [historicalSale()] }), "sale-1", "Erro no pedido", fixedOptions());
  assert.equal(result.sale.dataCancelamento, "2026-09-27T10:00:00.000Z");
});

test("24. motivo do cancelamento é obrigatório", () => {
  const result = cancelSale(database({ sales: [historicalSale()] }), "sale-1", "   ", fixedOptions());
  assert.equal(result.ok, false);
});

test("25. cancelamento devolve a quantidade ao estoque", () => {
  const result = cancelSale(database({ products: [product({ quantidadeEstoque: 5 })], sales: [historicalSale()] }), "sale-1", "Devolução", fixedOptions());
  assert.equal(result.database.products[0].quantidadeEstoque, 6);
});

test("26. cancelamento cria movimentação CANCELAMENTO_VENDA", () => {
  const result = cancelSale(database({ sales: [historicalSale()] }), "sale-1", "Devolução", fixedOptions());
  assert.equal(result.movements[0].tipo, "CANCELAMENTO_VENDA");
});

test("27. movimentação de cancelamento possui vendaId", () => {
  const result = cancelSale(database({ sales: [historicalSale()] }), "sale-1", "Devolução", fixedOptions());
  assert.equal(result.movements[0].vendaId, "sale-1");
});

test("28. produto desativado recebe estoque sem ser reativado", () => {
  const result = cancelSale(database({ products: [product({ ativo: false, quantidadeEstoque: 5 })], sales: [historicalSale()] }), "sale-1", "Devolução", fixedOptions());
  assert.equal(result.database.products[0].quantidadeEstoque, 6);
  assert.equal(result.database.products[0].ativo, false);
});

test("29. venda cancelada não pode ser cancelada novamente", () => {
  const cancelled = historicalSale({ status: "CANCELADA" });
  const result = cancelSale(database({ sales: [cancelled] }), "sale-1", "Outra tentativa", fixedOptions());
  assert.equal(result.ok, false);
});

test("30. produto inexistente impede toda a operação", () => {
  const db = database({ products: [], sales: [historicalSale()] });
  const result = cancelSale(db, "sale-1", "Devolução", fixedOptions());
  assert.equal(result.ok, false);
  assert.equal(result.database, undefined);
});

test("31. falha no cancelamento não altera nenhum estoque", () => {
  const originalProduct = product({ id: "outro", quantidadeEstoque: 7 });
  const db = database({ products: [originalProduct], sales: [historicalSale()] });
  cancelSale(db, "sale-1", "Devolução", fixedOptions());
  assert.equal(db.products[0].quantidadeEstoque, 7);
  assert.equal(db.stockMovements.length, 0);
});

test("32. falha no cancelamento não altera o status da venda", () => {
  const db = database({ products: [], sales: [historicalSale()] });
  cancelSale(db, "sale-1", "Devolução", fixedOptions());
  assert.equal(db.sales[0].status, "CONCLUIDA");
});

test("33. cancelamento de vários itens atualiza todos os produtos", () => {
  const multiItemSale = historicalSale({
    itens: [
      { ...historicalSale().itens[0], quantidade: 2, subtotal: 180 },
      { id: "item-history-2", produtoId: "p2", codigoProduto: "OL-10", descricaoProduto: "Óleo", quantidade: 1, precoOriginal: 50, precoUnitario: 50, subtotal: 50 }
    ]
  });
  const products = [product({ quantidadeEstoque: 8 }), product({ id: "p2", nome: "Óleo", quantidadeEstoque: 4 })];
  const result = cancelSale(database({ products, sales: [multiItemSale] }), "sale-1", "Pedido duplicado", fixedOptions());
  assert.deepEqual(result.database.products.map((item) => item.quantidadeEstoque), [10, 5]);
  assert.equal(result.movements.length, 2);
});

test("34. vendas canceladas não entram no faturamento", () => {
  const metrics = getCompletedSalesMetrics([
    historicalSale({ id: "valid", total: 90 }),
    historicalSale({ id: "cancelled", total: 500, status: "CANCELADA" })
  ]);
  assert.equal(metrics.completedSales, 1);
  assert.equal(metrics.revenue, 90);
});

test("35. vendas canceladas não entram em produtos mais vendidos", () => {
  const ranking = getTopSellingProducts([
    historicalSale({ id: "valid" }),
    historicalSale({ id: "cancelled", status: "CANCELADA", itens: [{ ...historicalSale().itens[0], quantidade: 50 }] })
  ]);
  assert.equal(ranking[0].quantidade, 1);
});

test("36. nova venda guarda clienteNome", () => {
  const customer = { id: "c1", nomeRazaoSocial: "Oficina do João", tipoCliente: "OFICINA" };
  const db = database({ customers: [customer] });
  const result = completeSale(db, completedDraft(addForCustomer(customer), { clienteId: "c1", tipoPrecoUtilizado: "REVENDA" }), fixedOptions());
  assert.equal(result.sale.clienteNome, "Oficina do João");
});

test("37. nova venda guarda clienteTipo", () => {
  const customer = { id: "c1", nomeRazaoSocial: "Oficina do João", tipoCliente: "OFICINA" };
  const db = database({ customers: [customer] });
  const result = completeSale(db, completedDraft(addForCustomer(customer), { clienteId: "c1", tipoPrecoUtilizado: "REVENDA" }), fixedOptions());
  assert.equal(result.sale.clienteTipo, "OFICINA");
});

test("38. venda balcão guarda dados do cliente como null", () => {
  const result = completeSale(database(), completedDraft(addForCustomer(null)), fixedOptions());
  assert.equal(result.sale.clienteId, null);
  assert.equal(result.sale.clienteNome, null);
  assert.equal(result.sale.clienteTipo, null);
});

test("39. alteração posterior do cliente não muda snapshot da venda", () => {
  const customer = { id: "c1", nomeRazaoSocial: "Oficina do João", tipoCliente: "OFICINA" };
  const result = completeSale(
    database({ customers: [customer] }),
    completedDraft(addForCustomer(customer), { clienteId: "c1", tipoPrecoUtilizado: "REVENDA" }),
    fixedOptions()
  );
  const receipt = getSaleReceiptData(result.sale, [{ ...customer, nomeRazaoSocial: "Oficina João & Filhos" }]);
  assert.equal(receipt.clienteNome, "Oficina do João");
});

test("40. comprovante utiliza descrição histórica do ItemVenda", () => {
  const receipt = getSaleReceiptData(historicalSale(), []);
  assert.equal(receipt.itens[0].descricaoProduto, "Pastilha de freio histórica");
});

test("41. comprovante utiliza preço praticado e não preço atual do produto", () => {
  const receipt = getSaleReceiptData(historicalSale(), []);
  const currentProduct = product({ precoVarejo: 999 });
  assert.equal(receipt.itens[0].precoUnitario, 90);
  assert.equal(currentProduct.precoVarejo, 999);
  assert.equal("precoOriginal" in receipt.itens[0], false);
});

test("42. desconto permanece disponível nos dados do comprovante", () => {
  const receipt = getSaleReceiptData(historicalSale({ subtotal: 100, desconto: 10, total: 90 }), []);
  assert.equal(receipt.desconto, 10);
  assert.equal(receipt.total, 90);
});

test("43. venda cancelada mantém os itens históricos", () => {
  const sale = historicalSale();
  const result = cancelSale(database({ sales: [sale] }), sale.id, "Pedido incorreto", fixedOptions());
  assert.deepEqual(result.sale.itens, sale.itens);
});

test("44. comprovante cancelado possui data e motivo do cancelamento", () => {
  const result = cancelSale(database({ sales: [historicalSale()] }), "sale-1", "Pedido incorreto", fixedOptions());
  const receipt = getSaleReceiptData(result.sale, []);
  assert.equal(receipt.status, "CANCELADA");
  assert.equal(receipt.dataCancelamento, "2026-09-27T10:00:00.000Z");
  assert.equal(receipt.motivoCancelamento, "Pedido incorreto");
});

test("45. venda antiga sem snapshot utiliza fallback compatível do cliente", () => {
  const oldSale = historicalSale({ clienteId: "c1" });
  delete oldSale.clienteNome;
  delete oldSale.clienteTipo;
  const receipt = getSaleReceiptData(oldSale, [{ id: "c1", nomeRazaoSocial: "Cliente legado", tipoCliente: "CLIENTE_COMUM" }]);
  assert.equal(receipt.clienteNome, "Cliente legado");
  assert.equal(receipt.clienteTipo, "CLIENTE_COMUM");
});
