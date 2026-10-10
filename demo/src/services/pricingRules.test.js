import test from "node:test";
import assert from "node:assert/strict";
import { PRICE_TYPE_LABELS, getDefaultPriceType } from "../data/domain.js";

test("aplica a tabela solicitada sem alterar os demais tipos", () => {
  assert.equal(getDefaultPriceType({ tipoCliente: "CLIENTE_COMUM" }), "VAREJO");
  assert.equal(getDefaultPriceType({ tipoCliente: "OFICINA" }), "REVENDA");
  assert.equal(getDefaultPriceType({ tipoCliente: "MECANICO" }), "REVENDA");
  assert.equal(getDefaultPriceType({ tipoCliente: "MOTOPECA" }), "REVENDA");
  assert.equal(getDefaultPriceType({ tipoCliente: "REVENDEDOR" }), "REVENDA");
  assert.equal(getDefaultPriceType(null), "VAREJO");
  assert.deepEqual(PRICE_TYPE_LABELS, { VAREJO: "Venda", REVENDA: "Revenda" });
});
