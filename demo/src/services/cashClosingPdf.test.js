import test from "node:test";
import assert from "node:assert/strict";
import { buildCashClosingPdf } from "./cashClosingPdf.js";

test("gera relatório de fechamento com totais financeiros e movimentos", () => {
  const bytes = buildCashClosingPdf({
    id: 7, status: "FECHADO", dataAbertura: "2026-10-16T08:00:00",
    dataFechamento: "2026-10-16T18:00:00", operadorAberturaEmail: "operador@teste",
    operadorFechamentoEmail: "operador@teste", valorInicial: 100, totalDinheiro: 200,
    totalPix: 50, totalCartaoDebito: 30, totalCartaoCredito: 20, totalOutro: 0,
    totalRecebido: 300, totalEstornos: 20, totalRecebidoLiquido: 280,
    totalEntradasAvulsas: 10, totalSaidasAvulsas: 5, saldoEsperado: 285,
    valorContado: 285, diferenca: 0,
    movimentacoes: [{ tipo: "SAIDA_AVULSA", valor: 5, descricao: "Frete", operadorEmail: "operador@teste", dataHora: "2026-10-16T12:00:00" }]
  });
  const content = new TextDecoder("latin1").decode(bytes);
  assert.match(content, /RELATORIO DE CAIXA #7/);
  assert.match(content, /Total bruto recebido/);
  assert.match(content, /Frete/);
});
