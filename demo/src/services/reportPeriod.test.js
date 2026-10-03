import assert from "node:assert/strict";
import test from "node:test";
import { formatAppliedPeriod } from "./reportPeriod.js";

test("descreve todo o período quando não há datas aplicadas", () => {
  assert.equal(formatAppliedPeriod(), "Todo o período");
});

test("descreve intervalo e limites parciais sem alterar as datas", () => {
  assert.equal(formatAppliedPeriod({ startDate: "2026-10-01", endDate: "2026-10-31" }), "01/10/2026 a 31/10/2026");
  assert.equal(formatAppliedPeriod({ startDate: "2026-10-01" }), "A partir de 01/10/2026");
  assert.equal(formatAppliedPeriod({ endDate: "2026-10-31" }), "Até 31/10/2026");
});
