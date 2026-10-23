import { formatCivilDate, formatCurrency, formatDateTime } from "../utils/formatters.js";
import { getOutstandingReceivables } from "./receivables.js";
import { buildThermalPdf, downloadPdf } from "./textPdf.js";
import { companyHeader, documentFooter } from "./thermalDocument.js";

function belongsToCustomer(account, group) {
  if (group.clienteId != null) {
    return String(account.clienteId) === String(group.clienteId);
  }
  return group.key === `conta:${account.id}`;
}

function pendingDebts(group) {
  return getOutstandingReceivables(group?.contas || [])
    .filter((account) => belongsToCustomer(account, group));
}

function debtStatus(account) {
  return account.situacao === "VENCIDA" ? "Vencida" : "Aberta";
}

function debtElements(account, index) {
  return [
    { type: "text", text: `DÍVIDA ${index + 1}`, align: "center", bold: true, fontSize: 8.3, gapBefore: 2, gapAfter: 4 },
    { type: "pair", left: "Venda", right: String(account.numeroVenda || account.vendaId || account.id), fontSize: 7.5, boldLeft: true, boldRight: true },
    { type: "pair", left: "Vencimento", right: formatCivilDate(account.vencimento), fontSize: 7.3, boldLeft: true },
    { type: "pair", left: "Situação", right: debtStatus(account), fontSize: 7.3, boldLeft: true, boldRight: true, gapAfter: 3 },
    { type: "pair", left: "Valor original", right: formatCurrency(account.valorOriginal), fontSize: 7.5, boldLeft: true, boldRight: true },
    { type: "pair", left: "Valor recebido", right: formatCurrency(account.valorRecebido), fontSize: 7.5, boldLeft: true, boldRight: true },
    { type: "pair", left: "Saldo pendente", right: formatCurrency(account.saldoPendente), fontSize: 8.5, boldLeft: true, boldRight: true, gapAfter: 5 },
    { type: "rule", style: "dotted", gapAfter: 5 }
  ];
}

export function buildConsolidatedReceivablesPdf(group, { issuedAt = new Date() } = {}) {
  const debts = pendingDebts(group);
  if (!debts.length) {
    throw new Error("O cliente não possui dívidas pendentes para gerar o extrato consolidado.");
  }
  const totalDue = debts.reduce((total, account) => total + Number(account.saldoPendente), 0);
  const elements = [
    ...companyHeader("EXTRATO CONSOLIDADO DE DÍVIDAS"),
    { type: "text", text: `Cliente: ${group.clienteNome || debts[0].clienteNome || "Não informado"}`, bold: true, fontSize: 8, lineHeight: 10, gapAfter: 2 },
    { type: "pair", left: "Emissão", right: formatDateTime(issuedAt), fontSize: 7.2, boldLeft: true, gapAfter: 5 },
    { type: "rule", style: "dashed", gapAfter: 5 },
    ...debts.flatMap(debtElements),
    { type: "text", text: "RESUMO", align: "center", bold: true, fontSize: 8.5, gapAfter: 5 },
    { type: "pair", left: "DÍVIDAS PENDENTES", right: String(debts.length), fontSize: 8.3, boldLeft: true, boldRight: true, gapAfter: 4 },
    { type: "rule", style: "solid", gapAfter: 5 },
    { type: "pair", left: "TOTAL DEVIDO", right: formatCurrency(totalDue), fontSize: 11, boldLeft: true, boldRight: true, gapAfter: 3 },
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
