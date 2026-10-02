import test from "node:test";
import assert from "node:assert/strict";
import { getCurrentUser, login } from "./authApi.js";
import { AUTH_TOKEN_KEY, clearAuthToken, getAuthToken, setAuthToken } from "./authSession.js";
import { apiRequest } from "./httpClient.js";

function installStorage() {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("login envia email e senha sem Authorization", async () => {
  installStorage();
  setAuthToken("token-antigo");
  let call;
  global.fetch = async (url, options) => {
    call = [url, options];
    return { ok: true, status: 200, json: async () => ({ token: "jwt", usuario: { id: 1, email: "a@b.com" } }) };
  };
  const response = await login("a@b.com", "segredo");
  assert.equal(response.token, "jwt");
  assert.deepEqual(JSON.parse(call[1].body), { email: "a@b.com", senha: "segredo" });
  assert.equal(call[1].headers.Authorization, undefined);
});

test("credenciais inválidas preservam 401 e mensagem", async () => {
  installStorage();
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: "Email ou senha inválidos." }) });
  await assert.rejects(login("x@y.com", "errada"), (error) => error.status === 401 && /inválidos/.test(error.message));
});

test("token usa chave exclusiva e pode ser removido no logout", () => {
  installStorage();
  setAuthToken("jwt-123");
  assert.equal(global.localStorage.getItem(AUTH_TOKEN_KEY), "jwt-123");
  assert.equal(getAuthToken(), "jwt-123");
  clearAuthToken();
  assert.equal(getAuthToken(), null);
});

test("auth me envia Bearer para restaurar sessão", async () => {
  installStorage();
  setAuthToken("jwt-restaurado");
  let headers;
  global.fetch = async (_url, options) => {
    headers = options.headers;
    return { ok: true, status: 200, json: async () => ({ id: 2, email: "op@saraiva.com" }) };
  };
  const user = await getCurrentUser();
  assert.equal(headers.Authorization, "Bearer jwt-restaurado");
  assert.equal(user.id, 2);
});

test("401 em API protegida limpa token", async () => {
  installStorage();
  setAuthToken("expirado");
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: "Autenticação necessária." }) });
  await assert.rejects(apiRequest("/api/dashboard"));
  assert.equal(getAuthToken(), null);
});

test("API protegida envia Bearer sem acessar armazenamento operacional", async () => {
  installStorage();
  setAuthToken("jwt-valido");
  let options;
  global.fetch = async (_url, value) => {
    options = value;
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  await apiRequest("/api/produtos");
  assert.equal(options.headers.Authorization, "Bearer jwt-valido");
  assert.equal(global.localStorage.getItem("saraiva-motos-database"), null);
  delete global.localStorage;
});

test("falha de rede retorna erro operacional sem expor detalhe interno do navegador", async () => {
  installStorage();
  global.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(
    getCurrentUser(),
    (error) => error.status === 0 && /validar (?:sua |a )sessão/i.test(error.message) && !/failed to fetch/i.test(error.message)
  );
});
