import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMonthLabel,
  getCurrentMonthValue,
  parseDateTime
} from "../utils/formatters.js";

test("formatador monetário não exibe NaN para dado inválido", () => {
  assert.equal(formatCurrency("valor-inválido"), "R$\u00a00,00");
});

test("formatador de data usa fallback para valores ausentes ou inválidos", () => {
  assert.equal(formatDateTime(null), "Não informado");
  assert.equal(formatDateTime("data-inválida", "-"), "-");
});

test("converte instante UTC para America/Sao_Paulo", () => {
  assert.match(formatDateTime("2026-10-21T13:29:00Z"), /21\/10\/2026, 10:29/);
});

test("não converte duas vezes timestamp que já possui offset", () => {
  const fromUtc = formatDateTime("2026-10-21T13:29:00Z");
  const fromBusinessOffset = formatDateTime("2026-10-21T10:29:00-03:00");
  assert.equal(fromBusinessOffset, fromUtc);
});

test("interpreta registro histórico sem offset como horário civil de São Paulo", () => {
  assert.equal(parseDateTime("2026-10-21T10:29:00").toISOString(), "2026-10-21T13:29:00.000Z");
  assert.match(formatDateTime("2026-10-21T10:29:00"), /21\/10\/2026, 10:29/);
});

test("formata a data do instante na zona da loja", () => {
  assert.equal(formatDate("2026-10-22T01:30:00Z"), "21/10/2026");
});

test("mantém o mês da loja na virada mensal independentemente do fuso do navegador", () => {
  assert.equal(getCurrentMonthValue(new Date("2026-11-01T01:30:00Z")), "2026-10");
  assert.match(formatMonthLabel("2026-10"), /outubro de 2026/i);
});
