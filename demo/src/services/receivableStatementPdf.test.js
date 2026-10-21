import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReceivableStatementPdf,
  getReceivableStatementPdfFilename
} from "./receivableStatementPdf.js";

function account(overrides = {}) {
  return {
    id: 15,
    numeroVenda: "000321",
    dataVenda: "2026-10-10T09:30:00",
    clienteNome: "Cliente da Silva",
    vencimento: "2026-11-10",
    valorOriginal: 1500,
    valorRecebido: 0,
    saldoPendente: 1500,
    situacao: "ABERTA",
    observacoes: null,
    recebimentos: [],
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

test("extrato sem pagamentos usa papel térmico de 80 mm e não declara quitação", () => {
  const pdf = content(buildReceivableStatementPdf(account()));
  const { width, height } = dimensions(pdf);

  assert.equal(width, 226.77);
  assert.ok(height < 841.89);
  assert.match(pdf, /SARAIVA MOTOS/);
  assert.match(pdf, /EXTRATO DO CLIENTE/);
  assert.match(pdf, /Data da venda/);
  assert.match(pdf, /Nenhum pagamento registrado/);
  assert.match(pdf, /H. saldo pendente; n.o ./);
  assert.match(pdf, /comprovante de quita..o/);
  assert.doesNotMatch(pdf, /Situa..o financeira: conta totalmente quitada/);
  assert.doesNotMatch(pdf, /\bre\s+f\b|\brg\b/);
});

test("extrato parcialmente pago mantém os totais recebidos da conta", () => {
  const pdf = content(buildReceivableStatementPdf(account({
    valorRecebido: 500,
    saldoPendente: 1000,
    situacao: "PARCIAL",
    recebimentos: [{
      id: 1,
      dataHora: "2026-10-15T14:20:00",
      formaPagamento: "PIX",
      valor: 500,
      estornado: false
    }]
  })));

  assert.match(pdf, /Parcialmente paga/);
  assert.match(pdf, /Forma: Pix/);
  assert.match(pdf, /R\$\s500,00/);
  assert.match(pdf, /R\$\s1\.000,00/);
});

test("extrato quitado informa situação sem saldo pendente", () => {
  const pdf = content(buildReceivableStatementPdf(account({
    valorRecebido: 1500,
    saldoPendente: 0,
    situacao: "QUITADA",
    recebimentos: [{
      id: 2,
      dataHora: "2026-10-20T18:45:00",
      formaPagamento: "DINHEIRO",
      valor: 1500,
      estornado: false
    }]
  })));

  assert.match(pdf, /Quitada/);
  assert.match(pdf, /SALDO PENDENTE/);
  assert.match(pdf, /R\$\s0,00/);
  assert.match(pdf, /Situa..o financeira: conta totalmente quitada/);
});

test("altura cresce para vários pagamentos e identifica pagamentos estornados", () => {
  const shortPdf = content(buildReceivableStatementPdf(account()));
  const payments = Array.from({ length: 18 }, (_, index) => ({
    id: index + 1,
    dataHora: `2026-10-${String((index % 20) + 1).padStart(2, "0")}T10:30:00`,
    formaPagamento: index % 2 ? "CARTAO_DEBITO" : "PIX",
    valor: 25,
    estornado: index === 4
  }));
  const longPdf = content(buildReceivableStatementPdf(account({ recebimentos: payments })));

  assert.ok(dimensions(longPdf).height > dimensions(shortPdf).height);
  assert.match(longPdf, /Cart.o de d.bito/);
  assert.match(longPdf, /ESTORNADO/);
});

test("quebra nome longo e acomoda valores monetários grandes", () => {
  const longName = "Cliente com razão social extremamente longa para validar a quebra segura do texto no papel térmico";
  const pdf = content(buildReceivableStatementPdf(account({
    clienteNome: longName,
    valorOriginal: 9999999999999.99,
    valorRecebido: 1234567890123.45,
    saldoPendente: 8765432109876.54
  })));
  const { width } = dimensions(pdf);

  assert.equal(width, 226.77);
  assert.match(pdf, /Cliente com raz.o social extremamente longa/);
  assert.match(pdf, /R\$\s8\.765\.432\.109\.876,54/);
  assert.equal(getReceivableStatementPdfFilename(account({ clienteNome: "João da Silva" })), "extrato-joao-da-silva-000321.pdf");
});

test("inclui observações reais da venda quando disponíveis", () => {
  const pdf = content(buildReceivableStatementPdf(account({
    observacoes: "Pagamento combinado diretamente com o cliente."
  })));

  assert.match(pdf, /OBSERVA..ES/);
  assert.match(pdf, /Pagamento combinado diretamente com o cliente/);
  assert.match(pdf, /\*\*\* EXTRATO DO CLIENTE \*\*\*/);
  assert.match(pdf, /Obrigado pela prefer.ncia/);
});
