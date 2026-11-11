import test from "node:test";
import assert from "node:assert/strict";
import { getCompanySettings, updateCompanySettings } from "./companySettingsApi.js";

function response(body) {
  return { ok: true, status: 200, json: async () => body };
}

test("consulta e atualização usam endpoint autenticado compartilhado", async () => {
  global.localStorage = { getItem: () => "jwt-operador" };
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push([url, options]);
    return response({ nomeFantasia: "Saraiva" });
  };
  const payload = { nomeFantasia: "Saraiva", razaoSocial: "Saraiva Ltda" };

  await getCompanySettings();
  await updateCompanySettings(payload);

  assert.match(calls[0][0], /\/api\/configuracoes\/empresa$/);
  assert.equal(calls[0][1].headers.Authorization, "Bearer jwt-operador");
  assert.equal(calls[1][1].method, "PUT");
  assert.equal(calls[1][1].headers.Authorization, "Bearer jwt-operador");
  assert.deepEqual(JSON.parse(calls[1][1].body), payload);
  delete global.localStorage;
});
