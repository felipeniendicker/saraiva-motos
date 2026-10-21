import { PAYMENT_METHOD_LABELS } from "../data/domain.js";
import { formatCurrency, formatDateTime } from "../utils/formatters.js";
import { buildThermalPdf, downloadPdf } from "./textPdf.js";
import { companyHeader, documentFooter } from "./thermalDocument.js";

const ACCOUNT_STATUS_LABELS = {
  ABERTA: "Aberta",
  PARCIAL: "Parcialmente paga",
  QUITADA: "Quitada",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada"
};

const DATE = new Intl.DateTimeFormat("pt-BR");

function formatDate(value) {
  if (!value) return "Não informada";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Não informada" : DATE.format(date);
}

function paymentElements(payment) {
  const status = payment.estornado ? " · ESTORNADO" : "";
  const method = PAYMENT_METHOD_LABELS[payment.formaPagamento]
    || payment.formaPagamento
    || "Não informada";

  return [
    {
      type: "pair",
      left: formatDateTime(payment.dataHora),
      right: formatCurrency(payment.valor),
      fontSize: 7.5,
      boldLeft: true,
      boldRight: true
    },
    {
      type: "text",
      text: `Forma: ${method}${status}`,
      fontSize: 7.1,
      lineHeight: 9,
      bold: Boolean(payment.estornado),
      gapAfter: 3
    },
    { type: "rule", style: "dotted", gapAfter: 4 }
  ];
}

function paymentHistoryElements(payments) {
  if (!payments.length) {
    return [{
      type: "text",
      text: "Nenhum pagamento registrado.",
      align: "center",
      fontSize: 7.4,
      gapAfter: 5
    }];
  }
  return payments.flatMap(paymentElements);
}

function statementNotice(account) {
  if (account.situacao === "QUITADA") return "Situação financeira: conta totalmente quitada.";
  if (account.situacao === "CANCELADA") return "Situação financeira: conta cancelada.";
  return "Documento de acompanhamento financeiro. Há saldo pendente; não é comprovante de quitação.";
}

export function buildReceivableStatementPdf(account) {
  const accountNumber = account.id || "Não informado";
  const saleNumber = account.numeroVenda || "Não informada";
  const payments = account.recebimentos || [];
  const saleDateElements = account.dataVenda
    ? [{ type: "pair", left: "Data da venda", right: formatDate(account.dataVenda.slice(0, 10)), fontSize: 7.3, boldLeft: true }]
    : [];

  const elements = [
    ...companyHeader("EXTRATO DO CLIENTE"),
    {
      type: "text",
      text: `Cliente: ${account.clienteNome || "Não informado"}`,
      fontSize: 7.5,
      lineHeight: 9.4,
      bold: true,
      gapAfter: 2
    },
    { type: "pair", left: "Conta a receber", right: String(accountNumber), fontSize: 7.3, boldLeft: true, boldRight: true },
    { type: "pair", left: "Venda", right: String(saleNumber), fontSize: 7.3, boldLeft: true, boldRight: true },
    ...saleDateElements,
    { type: "pair", left: "Vencimento", right: formatDate(account.vencimento), fontSize: 7.3, boldLeft: true },
    {
      type: "pair",
      left: "Situação",
      right: ACCOUNT_STATUS_LABELS[account.situacao] || account.situacao || "Não informada",
      fontSize: 7.3,
      boldLeft: true,
      boldRight: true,
      gapAfter: 5
    },
    { type: "rule", style: "dashed", gapAfter: 5 },
    { type: "text", text: "HISTÓRICO DE PAGAMENTOS", align: "center", bold: true, fontSize: 8.5, gapAfter: 5 },
    ...paymentHistoryElements(payments),
    { type: "text", text: "RESUMO FINANCEIRO", align: "center", bold: true, fontSize: 8.5, gapBefore: 2, gapAfter: 5 },
    { type: "pair", left: "VALOR ORIGINAL", right: formatCurrency(account.valorOriginal), fontSize: 8.2, boldLeft: true, boldRight: true, gapAfter: 2 },
    { type: "pair", left: "TOTAL RECEBIDO", right: formatCurrency(account.valorRecebido), fontSize: 8.2, boldLeft: true, boldRight: true, gapAfter: 4 },
    { type: "rule", style: "solid", gapAfter: 5 },
    { type: "pair", left: "SALDO PENDENTE", right: formatCurrency(account.saldoPendente), fontSize: 11, boldLeft: true, boldRight: true, gapAfter: 3 },
    ...documentFooter("*** EXTRATO DO CLIENTE ***", account.observacoes, statementNotice(account))
  ];

  return buildThermalPdf(elements, { paperWidth: 226.77, margin: 10, bottomMargin: 9 });
}

export function getReceivableStatementPdfFilename(account) {
  const customer = String(account?.clienteNome || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "cliente";
  const reference = String(account?.numeroVenda || account?.id || "conta")
    .replace(/[^a-zA-Z0-9_-]/g, "-");
  return `extrato-${customer}-${reference}.pdf`;
}

export function saveReceivableStatementPdf(account) {
  downloadPdf(buildReceivableStatementPdf(account), getReceivableStatementPdfFilename(account));
}
