import { PAYMENT_METHOD_LABELS } from "../data/domain.js";
import { formatCivilDate, formatCurrency, formatDateTime } from "../utils/formatters.js";
import { buildThermalPdf, downloadPdf } from "./textPdf.js";
import { companyHeader, documentFooter } from "./thermalDocument.js";

function belongsToCustomer(account, group) {
  if (group.clienteId != null) {
    return String(account.clienteId) === String(group.clienteId);
  }
  return group.key === `conta:${account.id}`;
}

function customerAccounts(group) {
  return (group?.contas || []).filter((account) => belongsToCustomer(account, group));
}

function debtStatus(account) {
  const labels = {
    ABERTA: "Aberta",
    PARCIAL: "Parcialmente paga",
    QUITADA: "Quitada",
    VENCIDA: "Vencida",
    CANCELADA: "Cancelada"
  };
  return labels[account.situacao] || account.situacao || "Não informada";
}

function paymentElements(payment) {
  const method = PAYMENT_METHOD_LABELS[payment.formaPagamento]
    || payment.formaPagamento
    || "Não informada";
  return [
    {
      type: "pair",
      left: `${formatDateTime(payment.dataHora)} · ${method}`,
      right: `${formatCurrency(payment.valor)}${payment.estornado ? " · ESTORNADO" : ""}`,
      fontSize: 6.9,
      boldRight: true
    },
    {
      type: "text",
      text: `Operador: ${payment.operadorEmail || "Não informado"}`,
      fontSize: 6.6,
      gapAfter: payment.estornado ? 1 : 3
    },
    ...(payment.estornado ? [{
      type: "text",
      text: `Estorno: ${formatDateTime(payment.dataEstorno)} · ${payment.motivoEstorno || "Motivo não informado"}`,
      fontSize: 6.6,
      bold: true,
      gapAfter: 3
    }] : [])
  ];
}

function debtElements(account, index) {
  const payments = account.recebimentos || [];
  return [
    { type: "text", text: `CONTA ${index + 1}`, align: "center", bold: true, fontSize: 8.3, gapBefore: 2, gapAfter: 4 },
    { type: "pair", left: "Venda", right: String(account.numeroVenda || account.vendaId || account.id), fontSize: 7.5, boldLeft: true, boldRight: true },
    ...(account.dataVenda ? [{ type: "pair", left: "Data da compra", right: formatCivilDate(account.dataVenda.slice(0, 10)), fontSize: 7.3, boldLeft: true }] : []),
    { type: "pair", left: "Vencimento", right: formatCivilDate(account.vencimento), fontSize: 7.3, boldLeft: true },
    { type: "pair", left: "Situação", right: debtStatus(account), fontSize: 7.3, boldLeft: true, boldRight: true, gapAfter: 3 },
    { type: "pair", left: "Valor original", right: formatCurrency(account.valorOriginal), fontSize: 7.5, boldLeft: true, boldRight: true },
    { type: "pair", left: "Valor recebido", right: formatCurrency(account.valorRecebido), fontSize: 7.5, boldLeft: true, boldRight: true },
    { type: "pair", left: "Saldo pendente", right: formatCurrency(account.saldoPendente), fontSize: 8.5, boldLeft: true, boldRight: true, gapAfter: 4 },
    { type: "text", text: "PAGAMENTOS", bold: true, fontSize: 7.2, gapAfter: 2 },
    ...(payments.length ? payments.flatMap(paymentElements) : [{ type: "text", text: "Nenhum pagamento registrado.", fontSize: 6.9, gapAfter: 3 }]),
    { type: "rule", style: "dotted", gapAfter: 5 }
  ];
}

export function buildConsolidatedReceivablesPdf(group, { issuedAt = new Date(), company } = {}) {
  const accounts = customerAccounts(group);
  if (!accounts.length) {
    throw new Error("O cliente não possui contas para gerar o extrato consolidado.");
  }
  const financialAccounts = accounts.filter((account) => account.situacao !== "CANCELADA");
  const totalOriginal = financialAccounts.reduce((total, account) => total + Number(account.valorOriginal || 0), 0);
  const totalReceived = financialAccounts.reduce((total, account) => total + Number(account.valorRecebido || 0), 0);
  const totalDue = financialAccounts.reduce((total, account) => total + Number(account.saldoPendente || 0), 0);
  const pendingCount = financialAccounts.filter((account) => Number(account.saldoPendente) > 0).length;
  const elements = [
    ...companyHeader("EXTRATO CONSOLIDADO DE DÍVIDAS", company),
    { type: "text", text: `Cliente: ${group.clienteNome || accounts[0].clienteNome || "Não informado"}`, bold: true, fontSize: 8, lineHeight: 10, gapAfter: 2 },
    { type: "pair", left: "Emissão", right: formatDateTime(issuedAt), fontSize: 7.2, boldLeft: true, gapAfter: 5 },
    { type: "rule", style: "dashed", gapAfter: 5 },
    ...accounts.flatMap(debtElements),
    { type: "text", text: "RESUMO", align: "center", bold: true, fontSize: 8.5, gapAfter: 5 },
    { type: "pair", left: "CONTAS", right: String(accounts.length), fontSize: 8.3, boldLeft: true, boldRight: true },
    { type: "pair", left: "DÍVIDAS PENDENTES", right: String(pendingCount), fontSize: 8.3, boldLeft: true, boldRight: true },
    { type: "pair", left: "TOTAL ORIGINAL", right: formatCurrency(totalOriginal), fontSize: 8.3, boldLeft: true, boldRight: true },
    { type: "pair", left: "TOTAL RECEBIDO", right: formatCurrency(totalReceived), fontSize: 8.3, boldLeft: true, boldRight: true, gapAfter: 4 },
    { type: "rule", style: "solid", gapAfter: 5 },
    { type: "pair", left: "TOTAL EM ABERTO", right: formatCurrency(totalDue), fontSize: 11, boldLeft: true, boldRight: true, gapAfter: 3 },
    ...documentFooter(
      "*** EXTRATO CONSOLIDADO DE DÍVIDAS ***",
      null,
      "Documento para acompanhamento de dívidas. Não comprova pagamento ou quitação."
    )
  ];

  return buildThermalPdf(elements, { paperWidth: 226.77, margin: 10, bottomMargin: 9 });
}

export function getConsolidatedReceivablesPdfFilename(group) {
  const customer = String(group?.clienteNome || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "cliente";
  const customerId = String(group?.clienteId ?? group?.key ?? "sem-id").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `extrato-consolidado-${customer}-${customerId}.pdf`;
}

export function saveConsolidatedReceivablesPdf(group) {
  downloadPdf(buildConsolidatedReceivablesPdf(group), getConsolidatedReceivablesPdfFilename(group));
}
