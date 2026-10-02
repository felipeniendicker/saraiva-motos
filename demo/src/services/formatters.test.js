import test from "node:test";
import assert from "node:assert/strict";
import { formatCurrency, formatDateTime } from "../utils/formatters.js";

test("formatador monetário não exibe NaN para dado inválido", () => {
  assert.equal(formatCurrency("valor-inválido"), "R$\u00a00,00");
});

test("formatador de data usa fallback para valores ausentes ou inválidos", () => {
  assert.equal(formatDateTime(null), "Não informado");
  assert.equal(formatDateTime("data-inválida", "-"), "-");
});
