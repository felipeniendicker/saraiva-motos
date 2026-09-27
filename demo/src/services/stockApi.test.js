import test from "node:test";
import assert from "node:assert/strict";
import { addStock, adjustStock, listProductMovements, listStockMovements, StockApiError } from "./stockApi.js";

function response(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

test("envia entrada para a API", async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8080/api/estoque/entrada");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { produtoId: 1, quantidade: 3, observacao: "Compra" });
    return response({ id: 10 });
  };
  assert.equal((await addStock({ produtoId: 1, quantidade: 3, observacao: "Compra" })).id, 10);
});

test("envia ajuste com o novo saldo real", async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8080/api/estoque/ajuste");
    assert.deepEqual(JSON.parse(options.body), { produtoId: 1, novoSaldo: 8, motivo: "Contagem" });
    return response({ saldoPosterior: 8 });
  };
  assert.equal((await adjustStock({ produtoId: 1, novoSaldo: 8, motivo: "Contagem" })).saldoPosterior, 8);
});

test("consulta histórico geral", async () => {
  global.fetch = async (url) => {
    assert.equal(url, "http://localhost:8080/api/estoque/movimentacoes");
    return response([]);
  };
  assert.deepEqual(await listStockMovements(), []);
});

test("consulta histórico por produto", async () => {
  global.fetch = async (url) => {
    assert.equal(url, "http://localhost:8080/api/estoque/movimentacoes?produtoId=42");
    return response([{ produtoId: 42 }]);
  };
  assert.equal((await listProductMovements(42))[0].produtoId, 42);
});

test("propaga mensagem e status de erro da API", async () => {
  global.fetch = async () => response({ message: "Produto inativo." }, false, 409);
  await assert.rejects(() => addStock({ produtoId: 1, quantidade: 1 }), (error) => {
    assert.ok(error instanceof StockApiError);
    assert.equal(error.status, 409);
    assert.equal(error.message, "Produto inativo.");
    return true;
  });
});

test("serviço remoto não acessa localStorage", async () => {
  global.localStorage = new Proxy({}, { get() { throw new Error("localStorage não deveria ser usado"); } });
  global.fetch = async () => response([]);
  await listStockMovements();
  delete global.localStorage;
});
