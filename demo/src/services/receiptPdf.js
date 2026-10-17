import { getSalePaymentLabel, PRICE_TYPE_LABELS, SALE_STATUS_LABELS } from "../data/domain.js";
import { getSaleReceiptData } from "./sales.js";
import { buildTextPdf, downloadPdf } from "./textPdf.js";

const PAPER_WIDTH = 226.77;
const MONEY = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PERCENT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });

function wrapLine(value, limit = 42) {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= limit) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function receiptLines(sale, customers) {
  const receipt = getSaleReceiptData(sale, customers);
  const lines = [
    "SARAIVA MOTOS",
    "COMPROVANTE DE VENDA",
    "------------------------------------------",
    `Venda: ${receipt.numeroVenda}`,
    `Data: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(receipt.dataHora))}`,
    `Status: ${SALE_STATUS_LABELS[receipt.status] || receipt.status}`,
    ...wrapLine(`Cliente: ${receipt.clienteNome || "Consumidor não identificado"}`),
    `Tabela: ${PRICE_TYPE_LABELS[receipt.tipoPrecoUtilizado] || receipt.tipoPrecoUtilizado}`,
    "------------------------------------------"
  ];

  for (const item of receipt.itens) {
    lines.push(...wrapLine(`${item.quantidade}x ${item.descricaoProduto}`));
    if (item.codigoProduto) lines.push(...wrapLine(`Ref.: ${item.codigoProduto}`));
    lines.push(`${item.quantidade} x ${MONEY.format(item.precoUnitario)} = ${MONEY.format(item.subtotal)}`);
  }

  lines.push(
    "------------------------------------------",
    `Subtotal: ${MONEY.format(receipt.subtotal)}`,
    `Desconto: ${PERCENT.format(receipt.descontoPercentual)}% (${MONEY.format(receipt.desconto)})`,
    `TOTAL: ${MONEY.format(receipt.total)}`,
    ...wrapLine(`Pagamento: ${getSalePaymentLabel(receipt)}`)
  );
  if (receipt.observacoes) lines.push(...wrapLine(`Observação: ${receipt.observacoes}`));
  if (receipt.status === "CANCELADA") {
    lines.push(...wrapLine(`Cancelada em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(receipt.dataCancelamento))}`));
    lines.push(...wrapLine(`Motivo: ${receipt.motivoCancelamento || "Não informado"}`));
  }
  lines.push("------------------------------------------", "Obrigado pela preferência!");
  return lines;
}

export function buildSaleReceiptPdf(sale, customers = []) {
  const lines = receiptLines(sale, customers);
  return buildTextPdf(lines, { paperWidth: PAPER_WIDTH, minHeight: 320, margin: 10, fontSize: 8, leading: 10 });
}

export function getSaleReceiptPdfFilename(sale) {
  const number = String(sale?.numeroVenda || sale?.id || "venda").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `comprovante-${number}.pdf`;
}

export function saveSaleReceiptPdf(sale, customers = []) {
  downloadPdf(buildSaleReceiptPdf(sale, customers), getSaleReceiptPdfFilename(sale));
}
