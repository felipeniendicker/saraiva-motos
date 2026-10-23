import test from "node:test";
import assert from "node:assert/strict";
import { buildProductPayload, parseStockQuantity } from "./productForm.js";

const form = (values = {}) => ({
  id: "",
  nome: " Pastilha de freio ",
  codigoReferencia: " REF-01 ",
  codigoBarras: " 00123456 ",
  marca: "Cobreq",
  categoria: "Freios",
  aplicacao: "CG 160",
  valorCusto: "10",
  precoVarejo: "25.50",
  precoRevenda: "20",
  quantidadeEstoque: "0",
  estoqueMinimo: "2",
  observacoes: "",
  ...values
});

test("cadastro permite estoque inicial zero", () => {
  assert.equal(buildProductPayload(form()).quantidadeEstoque, 0);
});

test("cadastro envia estoque inicial positivo como inteiro", () => {
  assert.equal(buildProductPayload(form({ quantidadeEstoque: "12" })).quantidadeEstoque, 12);
});

test("estoque inicial negativo ou decimal é rejeitado", () => {
  assert.throws(() => parseStockQuantity("-1", "A quantidade"), /inteiro maior ou igual a zero/);
  assert.throws(() => parseStockQuantity("1.5", "A quantidade"), /inteiro maior ou igual a zero/);
});

test("cadastro por código de barras preserva código e estoque inicial", () => {
  const payload = buildProductPayload(form({ codigoBarras: " 00012345 ", quantidadeEstoque: "4" }));

  assert.equal(payload.codigoBarras, "00012345");
  assert.equal(payload.quantidadeEstoque, 4);
});

test("payload de edição mantém o saldo exibido sem criar ajuste local", () => {
  const payload = buildProductPayload(form({ id: 9, quantidadeEstoque: "8" }));

  assert.equal(payload.id, 9);
  assert.equal(payload.quantidadeEstoque, 8);
});
