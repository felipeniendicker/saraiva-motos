import test from "node:test";
import assert from "node:assert/strict";
import { convertQuoteToOrder, finalizeOrder } from "./ordersApi.js";

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

test("conversão em pedido usa o orçamento sem criar venda", async () => {
  let url;
  let options;
  global.fetch = async (value, request) => { url = value; options = request; return response({ id: 8 }); };
  await convertQuoteToOrder(4, { previsaoRetirada: null, observacoes: null });
  assert.match(url, /\/api\/orcamentos\/4\/pedido$/);
  assert.equal(options.method, "POST");
});

test("finalização do pedido envia chave idempotente", async () => {
  let options;
  global.fetch = async (_url, request) => { options = request; return response({ id: 9 }); };
  await finalizeOrder(8, { formaPagamento: "PIX", condicaoPagamento: "IMEDIATO" },
    "22678568-96ff-49c2-a812-3b160e19ad99");
  assert.equal(options.headers["Idempotency-Key"], "22678568-96ff-49c2-a812-3b160e19ad99");
});
