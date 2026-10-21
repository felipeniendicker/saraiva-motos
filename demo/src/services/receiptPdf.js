import { getSalePaymentLabel, PRICE_TYPE_LABELS, SALE_STATUS_LABELS } from "../data/domain.js";
import { formatDateTime } from "../utils/formatters.js";
import { getSaleReceiptData } from "./sales.js";
import { buildThermalPdf, downloadPdf } from "./textPdf.js";
import { companyHeader, documentFooter } from "./thermalDocument.js";

const MONEY = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });
function saleItemElements(item) {
  return [
    { type: "text", text: item.descricaoProduto || "Item sem descrição", bold: true, fontSize: 7.6, lineHeight: 9.4 },
    ...(item.codigoProduto ? [{ type: "text", text: `Ref.: ${item.codigoProduto}`, fontSize: 6.7, lineHeight: 8 }] : []),
    {
      type: "pair",
      left: `Qtd. ${item.quantidade} x ${MONEY.format(item.precoUnitario)}`,
      right: MONEY.format(item.subtotal),
      fontSize: 7.3,
      boldRight: true,
      gapAfter: 3
    },
    { type: "rule", style: "dotted", gapAfter: 4 }
  ];
}

function cancellationElements(receipt) {
  if (receipt.status !== "CANCELADA") return [];
  return [
    { type: "rule", style: "dashed", gapBefore: 3, gapAfter: 5 },
    { type: "text", text: "VENDA CANCELADA", align: "center", bold: true, fontSize: 9, gapAfter: 2 },
    { type: "text", text: `Cancelada em: ${formatDateTime(receipt.dataCancelamento)}`, fontSize: 7.2 },
    { type: "text", text: `Motivo: ${receipt.motivoCancelamento || "Não informado"}`, fontSize: 7.2, lineHeight: 9 }
  ];
}

export function buildSaleReceiptPdf(sale, customers = []) {
  const receipt = getSaleReceiptData(sale, customers);
  const number = receipt.numeroVenda || receipt.id || "Não informado";
  const elements = [
    ...companyHeader("COMPROVANTE"),
    { type: "pair", left: "Número", right: String(number), fontSize: 7.4, boldLeft: true, boldRight: true },
    { type: "pair", left: "Emissão", right: formatDateTime(receipt.dataHora), fontSize: 7.2, boldLeft: true },
    { type: "pair", left: "Status", right: SALE_STATUS_LABELS[receipt.status] || receipt.status || "Não informado", fontSize: 7.2, boldLeft: true, gapAfter: 2 },
    { type: "text", text: `Cliente: ${receipt.clienteNome || "Consumidor não identificado"}`, fontSize: 7.3, lineHeight: 9.2 },
    { type: "text", text: `Vendedor: ${sale.operadorEmail || sale.vendedor || "Não informado"}`, fontSize: 7.3, lineHeight: 9.2 },
    { type: "text", text: `Tabela: ${PRICE_TYPE_LABELS[receipt.tipoPrecoUtilizado] || receipt.tipoPrecoUtilizado || "Não informada"}`, fontSize: 7.3, lineHeight: 9.2, gapAfter: 5 },
    { type: "rule", style: "dashed", gapAfter: 5 },
    { type: "pair", left: "DESCRIÇÃO / QTD. x UNIT.", right: "TOTAL", fontSize: 6.8, boldLeft: true, boldRight: true, gapAfter: 4 },
    ...(receipt.itens || []).flatMap(saleItemElements),
    { type: "pair", left: "Subtotal", right: MONEY.format(receipt.subtotal), fontSize: 8, boldLeft: true, boldRight: true, gapBefore: 2 },
    {
      type: "pair",
      left: `Desconto (${PERCENT.format(Number(receipt.descontoPercentual || 0))}%)`,
      right: MONEY.format(receipt.desconto),
      fontSize: 8,
      boldRight: true,
      gapAfter: 3
    },
    { type: "rule", style: "solid", gapAfter: 5 },
    { type: "pair", left: "TOTAL", right: MONEY.format(receipt.total), fontSize: 11, boldLeft: true, boldRight: true, gapAfter: 3 },
    { type: "text", text: `Pagamento: ${getSalePaymentLabel(receipt)}`, fontSize: 7.5, lineHeight: 9.5 },
    ...cancellationElements(receipt),
    ...documentFooter(`COMPROVANTE ${number}`, receipt.observacoes)
  ];
  return buildThermalPdf(elements, { paperWidth: 226.77, margin: 10, bottomMargin: 9 });
}

export function getSaleReceiptPdfFilename(sale) {
  const number = String(sale?.numeroVenda || sale?.id || "venda").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `comprovante-${number}.pdf`;
}

export function saveSaleReceiptPdf(sale, customers = []) {
  downloadPdf(buildSaleReceiptPdf(sale, customers), getSaleReceiptPdfFilename(sale));
}
