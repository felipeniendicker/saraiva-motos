import test from "node:test";
import assert from "node:assert/strict";
import { initializeRuntimeDatabase, saveRuntimeDatabase } from "./runtimeDatabase.js";

test("backend mode não carrega banco legado nem inicializa seed", () => {
  let calls = 0;
  const database = initializeRuntimeDatabase(true, () => { calls += 1; throw new Error("não deveria carregar"); });
  assert.equal(calls, 0);
  assert.deepEqual(database.products, []);
  assert.deepEqual(database.customers, []);
});

test("backend mode não salva no localStorage", () => {
  let calls = 0;
  saveRuntimeDatabase(true, () => { calls += 1; }, { products: [] });
  assert.equal(calls, 0);
});

test("modo legado mantém carregamento e persistência explícitos", () => {
  let saved = null;
  assert.equal(initializeRuntimeDatabase(false, () => ({ legacy: true })).legacy, true);
  saveRuntimeDatabase(false, (database) => { saved = database; }, { legacy: true });
  assert.deepEqual(saved, { legacy: true });
});
