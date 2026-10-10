import { PAYMENT_METHOD_LABELS, PRICE_TYPE_LABELS, SALE_STATUS_LABELS } from "../data/domain.js";
import { getSaleReceiptData } from "./sales.js";

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
    ...wrapLine(`Pagamento: ${PAYMENT_METHOD_LABELS[receipt.formaPagamento] || receipt.formaPagamento}`)
  );
  if (receipt.observacoes) lines.push(...wrapLine(`Observação: ${receipt.observacoes}`));
  if (receipt.status === "CANCELADA") {
    lines.push(...wrapLine(`Cancelada em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(receipt.dataCancelamento))}`));
    lines.push(...wrapLine(`Motivo: ${receipt.motivoCancelamento || "Não informado"}`));
  }
  lines.push("------------------------------------------", "Obrigado pela preferência!");
  return lines;
}

function escapePdfText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]/g, " ");
}

function encodeWindows1252(value) {
  const special = new Map([["€", 128], ["‚", 130], ["ƒ", 131], ["„", 132], ["…", 133], ["†", 134], ["‡", 135], ["ˆ", 136], ["‰", 137], ["Š", 138], ["‹", 139], ["Œ", 140], ["Ž", 142], ["‘", 145], ["’", 146], ["“", 147], ["”", 148], ["•", 149], ["–", 150], ["—", 151], ["˜", 152], ["™", 153], ["š", 154], ["›", 155], ["œ", 156], ["ž", 158], ["Ÿ", 159]]);
  return Uint8Array.from([...value].map((character) => {
    const code = character.codePointAt(0);
    if (code <= 255) return code;
    return special.get(character) ?? 63;
  }));
}

function concatBytes(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function buildSaleReceiptPdf(sale, customers = []) {
  const lines = receiptLines(sale, customers);
  const paperHeight = Math.max(320, 48 + lines.length * 11);
  const stream = ["BT", "/F1 8 Tf", "10 TL", `10 ${paperHeight - 18} Td`, ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAPER_WIDTH} ${paperHeight}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${encodeWindows1252(stream).length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  ];
  const parts = [encodeWindows1252("%PDF-1.4\n%âãÏÓ\n")];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const bytes = encodeWindows1252(`${index + 1} 0 obj\n${object}\nendobj\n`);
    parts.push(bytes);
    length += bytes.length;
  });
  const xrefOffset = length;
  const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f ", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `), "trailer", `<< /Size ${objects.length + 1} /Root 1 0 R >>`, "startxref", String(xrefOffset), "%%EOF", ""].join("\n");
  parts.push(encodeWindows1252(xref));
  return concatBytes(parts);
}

export function getSaleReceiptPdfFilename(sale) {
  const number = String(sale?.numeroVenda || sale?.id || "venda").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `comprovante-${number}.pdf`;
}

export function saveSaleReceiptPdf(sale, customers = []) {
  const url = URL.createObjectURL(new Blob([buildSaleReceiptPdf(sale, customers)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = getSaleReceiptPdfFilename(sale);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
