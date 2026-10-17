import test from "node:test";
import assert from "node:assert/strict";
import { getSalePaymentLabel } from "../data/domain.js";

test("venda a prazo e exibida como a prazo mesmo com forma tecnica OUTRO", () => {
  assert.equal(getSalePaymentLabel({ condicaoPagamento: "A_PRAZO", formaPagamento: "OUTRO" }), "A prazo");
  assert.equal(getSalePaymentLabel({ condicaoPagamento: "IMEDIATO", formaPagamento: "PIX" }), "Pix");
});
