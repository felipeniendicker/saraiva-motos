import { formatCurrency, formatDateTime } from "../utils/formatters.js";
import { buildThermalPdf, downloadPdf } from "./textPdf.js";
import { companyHeader, documentFooter } from "./thermalDocument.js";
import { PAYMENT_METHOD_LABELS } from "../data/domain.js";

const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });

function formatDate(value) {
  if (!value) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

function quoteItemElements(item) {
  return [
    { type: "text", text: item.descricaoItem || "Item sem descrição", bold: true, fontSize: 7.6, lineHeight: 9.4 },
    ...(item.codigoItem ? [{ type: "text", text: `Ref.: ${item.codigoItem}`, fontSize: 6.7, lineHeight: 8 }] : []),
    {
      type: "pair",
      left: `Qtd. ${item.quantidade} x ${formatCurrency(item.precoUnitario)}`,
      right: formatCurrency(item.subtotal),
      fontSize: 7.3,
      boldRight: true,
      gapAfter: 3
    },
    { type: "rule", style: "dotted", gapAfter: 4 }
  ];
}

export function buildQuotePdf(quote, company) {
  const number = quote.numero || "Não informado";
  const credit = quote.condicaoPagamentoPrevista === "A_PRAZO";
  const initialPayment = Number(quote.entradaPrevista || 0);
  const paymentLabel = credit
    ? "A prazo"
    : PAYMENT_METHOD_LABELS[quote.formaPagamentoPrevista] || "Não informada";
  const elements = [
    ...companyHeader("ORÇAMENTO", company),
    { type: "pair", left: "Número", right: number, fontSize: 7.4, boldLeft: true, boldRight: true },
    { type: "pair", left: "Emissão", right: formatDateTime(quote.dataEmissao), fontSize: 7.2, boldLeft: true },
    { type: "pair", left: "Validade", right: formatDate(quote.validade), fontSize: 7.2, boldLeft: true, gapAfter: 2 },
    { type: "text", text: `Cliente: ${quote.clienteNome || "Consumidor não identificado"}`, fontSize: 7.3, lineHeight: 9.2 },
    { type: "text", text: `Vendedor: ${quote.operadorEmail || "Não informado"}`, fontSize: 7.3, lineHeight: 9.2, gapAfter: 5 },
    { type: "rule", style: "dashed", gapAfter: 5 },
    { type: "pair", left: "DESCRIÇÃO / QTD. x UNIT.", right: "TOTAL", fontSize: 6.8, boldLeft: true, boldRight: true, gapAfter: 4 },
    ...(quote.itens || []).flatMap(quoteItemElements),
    { type: "pair", left: "Subtotal", right: formatCurrency(quote.subtotal), fontSize: 8, boldLeft: true, boldRight: true, gapBefore: 2 },
    {
      type: "pair",
      left: `Desconto (${PERCENT.format(Number(quote.descontoPercentual || 0))}%)`,
      right: formatCurrency(quote.desconto),
      fontSize: 8,
      boldRight: true,
      gapAfter: 3
    },
    { type: "rule", style: "solid", gapAfter: 5 },
    { type: "pair", left: "TOTAL", right: formatCurrency(quote.total), fontSize: 11, boldLeft: true, boldRight: true, gapAfter: 3 },
    { type: "rule", style: "dashed", gapBefore: 3, gapAfter: 4 },
    { type: "pair", left: "Pagamento previsto", right: paymentLabel, fontSize: 7.5, boldLeft: true, boldRight: true },
    ...(credit ? [
      { type: "pair", left: "Vencimento previsto", right: formatDate(quote.vencimentoPrevisto), fontSize: 7.3, boldLeft: true },
      { type: "pair", left: "Entrada prevista", right: formatCurrency(initialPayment), fontSize: 7.3, boldLeft: true },
      ...(initialPayment > 0 ? [{
        type: "pair", left: "Forma prevista da entrada",
        right: PAYMENT_METHOD_LABELS[quote.formaPagamentoEntradaPrevista] || "Não informada",
        fontSize: 7.3, boldLeft: true
      }] : []),
      { type: "pair", left: "Saldo previsto a prazo", right: formatCurrency(Math.max(0, Number(quote.total) - initialPayment)), fontSize: 8.5, boldLeft: true, boldRight: true, gapAfter: 3 }
    ] : []),
    ...documentFooter(
      `ORÇAMENTO ${number}`,
      quote.observacoes,
      "Este orçamento não reserva estoque. Preços e disponibilidade serão validados na venda."
    )
  ];
  return buildThermalPdf(elements, { paperWidth: 226.77, margin: 10, bottomMargin: 9 });
}

export function saveQuotePdf(quote) {
  downloadPdf(buildQuotePdf(quote), `orcamento-${quote.numero}.pdf`);
}
