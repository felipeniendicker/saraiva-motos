import test from "node:test";
import assert from "node:assert/strict";
import { filterStockMovements, getStockStatus, searchOperationalProducts, toLegacyStockMovement } from "./inventory.js";

const products = [
  { id: 1, nome: "Óleo 10W40", codigoReferencia: "OL-10", codigoBarras: "0789", marca: "Motul", categoria: "Lubrificantes", aplicacao: "CG 160", quantidadeEstoque: 4, estoqueMinimo: 4, ativo: true },
  { id: 2, nome: "Produto inativo", codigoReferencia: "IN-1", quantidadeEstoque: 0, estoqueMinimo: 1, ativo: false }
];

test("localiza produto ativo pelos campos operacionais", () => {
  for (const query of ["óleo", "OL-10", "0789", "motul", "lubrificantes", "CG 160"]) {
    assert.deepEqual(searchOperationalProducts(products, query).map((product) => product.id), [1]);
  }
  assert.equal(searchOperationalProducts(products, "inativo").length, 0);
});

test("classifica estoque normal, baixo e zerado", () => {
  assert.equal(getStockStatus({ quantidadeEstoque: 5, estoqueMinimo: 4 }), "NORMAL");
  assert.equal(getStockStatus({ quantidadeEstoque: 4, estoqueMinimo: 4 }), "BAIXO");
  assert.equal(getStockStatus({ quantidadeEstoque: 0, estoqueMinimo: 4 }), "SEM_ESTOQUE");
});

test("filtra histórico por produto, tipo e período e ordena recente primeiro", () => {
  const movements = [
    { id: 1, produtoId: 1, tipo: "ENTRADA", dataHora: "2026-09-01T10:00:00" },
    { id: 2, produtoId: 1, tipo: "SAIDA_MANUAL", dataHora: "2026-09-03T10:00:00" },
    { id: 3, produtoId: 2, tipo: "SAIDA_MANUAL", dataHora: "2026-09-04T10:00:00" }
  ];
  assert.deepEqual(filterStockMovements(movements, { productId: 1, type: "SAIDA_MANUAL", dateFrom: "2026-09-02", dateTo: "2026-09-03" }).map((movement) => movement.id), [2]);
  assert.deepEqual(filterStockMovements(movements).map((movement) => movement.id), [3, 2, 1]);
});

test("monta entrada, ajuste e saída para o modo legado", () => {
  const product = { quantidadeEstoque: 5 };
  assert.equal(toLegacyStockMovement({ produtoId: "1", operacao: "ENTRADA", valor: "2", motivo: "Compra" }, product).tipo, "ENTRADA");
  assert.equal(toLegacyStockMovement({ produtoId: "1", operacao: "AJUSTE", valor: "3", motivo: "Contagem" }, product).tipo, "AJUSTE_SAIDA");
  assert.equal(toLegacyStockMovement({ produtoId: "1", operacao: "SAIDA", valor: "1", motivo: "Uso interno" }, product).tipo, "SAIDA_MANUAL");
});
