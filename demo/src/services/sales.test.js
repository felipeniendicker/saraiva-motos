import test from "node:test";
import assert from "node:assert/strict";
import { addProductToCart, buildSaleConfirmation, calculateSaleTotals, changeCartItemPrice, changeCartItemQuantity, filterSalesHistory, findProductByCode, getSaleReceiptData, repriceCart, runSingleSubmission, searchActiveCustomers, searchActiveProducts } from "./sales.js";

const product = (values = {}) => ({ id: 1, nome: "Pastilha", codigoReferencia: "PF-1", codigoBarras: "00123", precoVarejo: 100, precoRevenda: 80, quantidadeEstoque: 2, ativo: true, ...values });

test("PDV encontra somente produto ativo e preserva zeros", () => {
  const products = [product(), product({ id: 2, ativo: false, codigoBarras: "9" })];
  assert.equal(findProductByCode(products, "00123").product.id, 1);
  assert.deepEqual(searchActiveProducts(products, "pastilha").map((item) => item.id), [1]);
});

test("carrinho preserva estoque e preço negociado", () => {
  const added = addProductToCart([], product(), "VAREJO", () => "item-1");
  assert.equal(changeCartItemQuantity(added.items, product(), 3).ok, false);
  const negotiated = changeCartItemPrice(added.items, 1, 90);
  assert.equal(repriceCart(negotiated.items, [product()], "REVENDA")[0].precoUnitario, 90);
});

test("totais, cliente opcional e confirmação continuam locais apenas como estado do carrinho", () => {
  assert.deepEqual(calculateSaleTotals([{ precoUnitario: 10.5, quantidade: 2 }], 1), { subtotal: 21, desconto: 1, total: 20 });
  assert.equal(buildSaleConfirmation({ items: [{ quantidade: 2 }], total: 20, paymentMethod: "PIX" }).customerName, "Consumidor não identificado");
});

test("busca considera somente clientes ativos", () => {
  assert.deepEqual(searchActiveCustomers([{ id: 1, nomeRazaoSocial: "Oficina", ativo: true }, { id: 2, nomeRazaoSocial: "Inativo", ativo: false }], "oficina").map((item) => item.id), [1]);
});

test("histórico e reimpressão usam snapshots recebidos da API", () => {
  const sale = { id: 1, numeroVenda: "000001", clienteId: null, dataHora: "2026-01-02T10:00:00", status: "CONCLUIDA", itens: [{ id: 1, descricaoProduto: "Snapshot", quantidade: 1, precoUnitario: 5, subtotal: 5 }], subtotal: 5, desconto: 0, total: 5 };
  assert.equal(filterSalesHistory([sale], { status: "CONCLUIDA" }).length, 1);
  assert.equal(getSaleReceiptData(sale).itens[0].descricaoProduto, "Snapshot");
});

test("trava impede submissão duplicada", async () => {
  assert.deepEqual(await runSingleSubmission({ current: true }, async () => ({ ok: true })), { skipped: true });
});
