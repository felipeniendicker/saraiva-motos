import test from "node:test";
import assert from "node:assert/strict";
import { getOperationAttempt } from "./operationAttempt.js";

test("reutiliza a chave após timeout da mesma operação", () => {
  const first = getOperationAttempt(null, { produtoId: 1, quantidade: 2 }, () => "key-1");
  const retry = getOperationAttempt(first, { produtoId: 1, quantidade: 2 }, () => "key-2");
  assert.equal(retry.key, "key-1");
});

test("gera outra chave quando o conteúdo muda", () => {
  const first = getOperationAttempt(null, { produtoId: 1, quantidade: 2 }, () => "key-1");
  const next = getOperationAttempt(first, { produtoId: 1, quantidade: 3 }, () => "key-2");
  assert.equal(next.key, "key-2");
});
