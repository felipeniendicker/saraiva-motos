import test from "node:test";
import assert from "node:assert/strict";
import { buildCashClosingPdf } from "./cashClosingPdf.js";
import { buildQuotePdf } from "./quotePdf.js";
import { buildSaleReceiptPdf } from "./receiptPdf.js";
import { buildConsolidatedReceivablesPdf } from "./receivableConsolidatedPdf.js";
import { buildReceivableStatementPdf } from "./receivableStatementPdf.js";

const company = {
  nomeFantasia: "OFICINA TESTE",
  razaoSocial: "OFICINA TESTE LTDA",
  cnpj: "11.222.333/0001-81",
  telefone: "(11) 99999-9999",
  endereco: "Rua Principal, 100",
  email: "contato@oficina.test"
};

function content(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

function assertCompanyHeader(bytes) {
  const pdf = content(bytes);
  assert.match(pdf, /OFICINA TESTE/);
  assert.match(pdf, /11\.222\.333\/0001-81/);
  assert.match(pdf, /contato@oficina\.test/);
}

test("comprovante e orçamento usam os dados empresariais informados", () => {
  assertCompanyHeader(buildSaleReceiptPdf({
    id: 1, numeroVenda: "000001", status: "CONCLUIDA", dataHora: "2026-10-30T10:00:00-03:00",
    itens: [], subtotal: 0, desconto: 0, descontoPercentual: 0, total: 0
  }, [], company));
  assertCompanyHeader(buildQuotePdf({
    numero: "ORC-1", dataEmissao: "2026-10-30T10:00:00-03:00", validade: "2026-11-30",
    itens: [], subtotal: 0, desconto: 0, descontoPercentual: 0, total: 0
  }, company));
});

test("extratos individual e consolidado usam os mesmos dados empresariais", () => {
  const account = {
    id: 1, vendaId: 1, numeroVenda: "000001", clienteId: 7, clienteNome: "Cliente",
    vencimento: "2026-11-30", situacao: "ABERTA", valorOriginal: 100,
    valorRecebido: 20, saldoPendente: 80, recebimentos: []
  };
  assertCompanyHeader(buildReceivableStatementPdf(account, company));
  assertCompanyHeader(buildConsolidatedReceivablesPdf({
    key: "cliente:7", clienteId: 7, clienteNome: "Cliente", contas: [account]
  }, { company, issuedAt: "2026-10-30T10:00:00-03:00" }));
});

test("fechamento de caixa usa cabeçalho empresarial e papel térmico de 80 mm", () => {
  const bytes = buildCashClosingPdf({
    id: 1, status: "FECHADO", dataAbertura: "2026-10-30T08:00:00-03:00",
    dataFechamento: "2026-10-30T18:00:00-03:00", operadorAberturaEmail: "op@test",
    operadorFechamentoEmail: "op@test", valorInicial: 0, totalDinheiro: 0, totalPix: 0,
    totalCartaoDebito: 0, totalCartaoCredito: 0, totalOutro: 0, totalRecebido: 0,
    totalEstornos: 0, totalRecebidoLiquido: 0, totalEntradasAvulsas: 0,
    totalSaidasAvulsas: 0, saldoEsperado: 0, valorContado: 0, diferenca: 0, movimentacoes: []
  }, company);
  assertCompanyHeader(bytes);
  assert.match(content(bytes), /MediaBox \[0 0 226\.77/);
});
