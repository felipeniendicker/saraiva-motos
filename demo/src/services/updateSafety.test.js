import test from "node:test";
import assert from "node:assert/strict";
import { isAppUpdateSafe, setAppUpdateBlocked } from "./updateSafety.js";

test("impede atualização enquanto existe operação comercial em andamento", () => {
  setAppUpdateBlocked("test-sale", true);
  assert.equal(isAppUpdateSafe(), false);
  setAppUpdateBlocked("test-sale", false);
  assert.equal(isAppUpdateSafe(), true);
});
