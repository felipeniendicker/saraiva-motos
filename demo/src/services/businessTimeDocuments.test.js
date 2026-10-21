import test from "node:test";
import assert from "node:assert/strict";
import { buildCashClosingPdf } from "./cashClosingPdf.js";
import { buildQuotePdf } from "./quotePdf.js";
import { buildSaleReceiptPdf } from "./receiptPdf.js";
import { buildReceivableStatementPdf } from "./receivableStatementPdf.js";
import { formatDateTime } from "../utils/formatters.js";

const BUSINESS_TIME = "2026-10-21T10:29:00-03:00";
const EXPECTED = "21/10/2026, 10:29";

function content(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

test("venda, pagamento, comprovante, caixa e orçamento exibem o mesmo horário da loja", () => {
  const receipt = content(buildSaleReceiptPdf({
    id: 1,
    numeroVenda: "000001",
    dataHora: BUSINESS_TIME,
    status: "CONCLUIDA",
    tipoPrecoUtilizado: "VAREJO",
    formaPagamento: "PIX",
    itens: [],
    subtotal: 100,
    desconto: 0,
    descontoPercentual: 0,
    total: 100
  }));
  const statement = content(buildReceivableStatementPdf({
    id: 1,
    numeroVenda: "000001",
    clienteNome: "Cliente",
    vencimento: "2026-11-21",
    situacao: "PARCIAL",
    valorOriginal: 100,
    valorRecebido: 20,
    saldoPendente: 80,
    recebimentos: [{ id: 1, dataHora: BUSINESS_TIME, formaPagamento: "PIX", valor: 20 }]
  }));
  const cash = content(buildCashClosingPdf({
    id: 1,
    status: "ABERTO",
    dataAbertura: BUSINESS_TIME,
    operadorAberturaEmail: "operador@saraiva.test",
    movimentacoes: [{
      id: 1,
      dataHora: BUSINESS_TIME,
      tipo: "VENDA_DINHEIRO",
      valor: 100,
      descricao: "Venda 000001",
      operadorEmail: "operador@saraiva.test"
    }]
  }));
  const quote = content(buildQuotePdf({
    numero: "ORC-000001",
    dataEmissao: BUSINESS_TIME,
    validade: "2026-10-28",
    itens: [],
    subtotal: 100,
    desconto: 0,
    descontoPercentual: 0,
    total: 100
  }));

  assert.equal(formatDateTime(BUSINESS_TIME), EXPECTED);
  for (const document of [receipt, statement, cash, quote]) {
    assert.match(document, /21\/10\/2026, 10:29/);
  }
});
