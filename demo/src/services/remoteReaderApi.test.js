import test from "node:test";
import assert from "node:assert/strict";
import {
  closeReaderSession,
  consumeReaderScan,
  createReaderSession,
  sendRemoteScan
} from "./remoteReaderApi.js";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("criação do pareamento exige autenticação do operador", async () => {
  global.localStorage = { getItem: () => "jwt-operador" };
  let headers;
  global.fetch = async (_url, options) => {
    headers = options.headers;
    return response({ sessaoId: "1" });
  };

  await createReaderSession();

  assert.equal(headers.Authorization, "Bearer jwt-operador");
  delete global.localStorage;
});

test("celular envia somente código e evento sem JWT", async () => {
  global.localStorage = { getItem: () => "jwt-nao-deve-sair" };
  let call;
  global.fetch = async (url, options) => {
    call = [url, options];
    return response({ id: 1 });
  };

  await sendRemoteScan(
    "pareamento",
    "7894900011517",
    "2d667c21-d005-4521-b011-8450f6c2dd87"
  );

  assert.equal(call[1].headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(call[1].body), {
    codigo: "7894900011517",
    eventoId: "2d667c21-d005-4521-b011-8450f6c2dd87"
  });
  delete global.localStorage;
});

test("computador autenticado consome a leitura pendente da própria sessão", async () => {
  global.localStorage = { getItem: () => "jwt-operador" };
  let call;
  global.fetch = async (url, options) => {
    call = [url, options];
    return response({ codigo: "7894900011517" });
  };

  const scan = await consumeReaderScan("sessao computador");

  assert.equal(scan.codigo, "7894900011517");
  assert.match(call[0], /\/api\/leitor\/sessoes\/sessao%20computador\/leituras\/proxima$/);
  assert.equal(call[1].headers.Authorization, "Bearer jwt-operador");
  delete global.localStorage;
});

test("encerramento usa a sessão autenticada e invalida pelo endpoint DELETE", async () => {
  global.localStorage = { getItem: () => "jwt-operador" };
  let call;
  global.fetch = async (url, options) => {
    call = [url, options];
    return response(null, 204);
  };

  await closeReaderSession("sessao-1");

  assert.match(call[0], /\/api\/leitor\/sessoes\/sessao-1$/);
  assert.equal(call[1].method, "DELETE");
  assert.equal(call[1].headers.Authorization, "Bearer jwt-operador");
  delete global.localStorage;
});
