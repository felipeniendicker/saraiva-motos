import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConsolidatedReceivablesPdf,
  getConsolidatedReceivablesPdfFilename
} from "./receivableConsolidatedPdf.js";

function account(overrides = {}) {
  return {
    id: 1,
    clienteId: 10,
    clienteNome: "Anderson Barbearia",
    numeroVenda: "000059",
    vencimento: "2026-10-30",
    situacao: "ABERTA",
    valorOriginal: 300,
    valorRecebido: 47,
    saldoPendente: 253,
    ...overrides
  };
}

function group(accounts, overrides = {}) {
  return {
    key: "cliente:10",
    clienteId: 10,
    clienteNome: "Anderson Barbearia",
    contas: accounts,
    ...overrides
  };
}

function content(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

function dimensions(pdfContent) {
  const match = pdfContent.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  return { width: Number(match?.[1]), height: Number(match?.[2]) };
}

test("duas dívidas geram um único PDF térmico com total dos saldos pendentes", () => {
  const pdf = content(buildConsolidatedReceivablesPdf(group([
    account(),
    account({ id: 2, numeroVenda: "000010", valorOriginal: 600, valorRecebido: 0, saldoPendente: 600, situacao: "VENCIDA" })
  ]), { issuedAt: new Date("2026-10-23T13:29:00Z") }));

  assert.equal(dimensions(pdf).width, 226.77);
  assert.match(pdf, /EXTRATO CONSOLIDADO DE D.VIDAS/);
  assert.match(pdf, /23\/10\/2026, 10:29/);
  assert.match(pdf, /000059/);
  assert.match(pdf, /000010/);
  assert.match(pdf, /D.VIDAS PENDENTES/);
  assert.match(pdf, /R\$\s853,00/);
  assert.match(pdf, /N.o comprova/);
  assert.match(pdf, /pagamento ou quita..o/);
});

test("pagamento parcial reduz o total consolidado atual", () => {
  const pdf = content(buildConsolidatedReceivablesPdf(group([
    account({ valorOriginal: 300, valorRecebido: 200, saldoPendente: 100 }),
    account({ id: 2, numeroVenda: "000010", valorOriginal: 600, valorRecebido: 50, saldoPendente: 550 })
  ])));

  assert.match(pdf, /R\$\s650,00/);
  assert.doesNotMatch(pdf, /R\$\s900,00/);
});

test("PDF exclui contas quitadas, canceladas e de outro cliente", () => {
  const pdf = content(buildConsolidatedReceivablesPdf(group([
    account(),
    account({ id: 2, numeroVenda: "QUITADA-01", situacao: "QUITADA", saldoPendente: 0 }),
    account({ id: 3, numeroVenda: "CANCELADA-01", situacao: "CANCELADA", saldoPendente: 100 }),
    account({ id: 4, clienteId: 20, numeroVenda: "HOMONIMO-01", saldoPendente: 500 })
  ])));

  assert.match(pdf, /000059/);
  assert.doesNotMatch(pdf, /QUITADA-01|CANCELADA-01|HOMONIMO-01/);
  assert.match(pdf, /R\$\s253,00/);
});

test("conteúdo extenso aumenta a altura sem cortar a última dívida", () => {
  const shortPdf = content(buildConsolidatedReceivablesPdf(group([account()])));
  const accounts = Array.from({ length: 35 }, (_, index) => account({
    id: index + 1,
    numeroVenda: `VENDA-${String(index + 1).padStart(3, "0")}`,
    saldoPendente: 10 + index
  }));
  const longPdf = content(buildConsolidatedReceivablesPdf(group(accounts, {
    clienteNome: "Cliente com nome empresarial muito longo para testar quebra de linha no documento consolidado"
  })));

  assert.ok(dimensions(longPdf).height > dimensions(shortPdf).height);
  assert.match(longPdf, /VENDA-035/);
  assert.equal(dimensions(longPdf).width, 226.77);
});

test("nome do arquivo diferencia clientes homônimos pelo clienteId", () => {
  assert.notEqual(
    getConsolidatedReceivablesPdfFilename(group([account()], { clienteId: 10 })),
    getConsolidatedReceivablesPdfFilename(group([account({ clienteId: 20 })], { clienteId: 20, key: "cliente:20" }))
  );
});
