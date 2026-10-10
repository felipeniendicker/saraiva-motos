import test from "node:test";
import assert from "node:assert/strict";
import { saveThenRefresh } from "./mutationFlow.js";

test("mantém sucesso da venda quando apenas a atualização da interface falha", async () => {
  const sale = { id: 42, numeroVenda: "000042" };
  const result = await saveThenRefresh(async () => sale, async () => { throw new Error("offline"); });
  assert.equal(result.value, sale);
  assert.equal(result.refreshError.message, "offline");
});

test("propaga falha ao salvar sem tentar atualizar a interface", async () => {
  let refreshed = false;
  await assert.rejects(() => saveThenRefresh(
    async () => { throw new Error("não salvou"); },
    async () => { refreshed = true; }
  ));
  assert.equal(refreshed, false);
});
