import test from "node:test";
import assert from "node:assert/strict";
import { lookupProductByCode } from "./productsApi.js";

test("lookup preserva zeros e usa endpoint estruturado com Bearer", async () => {
  const values = new Map([["saraiva-motos-auth-token", "jwt-barcode"]]);
  global.localStorage = { getItem: (key) => values.get(key) ?? null };
  let call;
  global.fetch = async (url, options) => {
    call = [url, options];
    return { ok: true, status: 200, json: async () => ({ encontrado: false, codigoConsultado: "000123" }) };
  };

  const result = await lookupProductByCode("000123");

  assert.match(call[0], /api\/produtos\/lookup\/000123$/);
  assert.equal(call[1].headers.Authorization, "Bearer jwt-barcode");
  assert.equal(result.codigoConsultado, "000123");
  delete global.localStorage;
});
