import test from "node:test";
import assert from "node:assert/strict";
import { buildSaleReceiptPdf, getSaleReceiptPdfFilename } from "./receiptPdf.js";

const sale = {
  id: 1,
  numeroVenda: "000001",
  dataHora: "2026-01-02T10:00:00",
  status: "CONCLUIDA",
  clienteId: 9,
  clienteNome: "Cliente histórico",
  clienteTipo: "CLIENTE_COMUM",
  tipoPrecoUtilizado: "REVENDA",
  formaPagamento: "PIX",
  itens: [{ id: 2, descricaoProduto: "Peça desativada", codigoProduto: "OLD-1", quantidade: 2, precoUnitario: 90, subtotal: 180 }],
  subtotal: 180,
  desconto: 18,
  descontoPercentual: 10,
  total: 162
};

test("gera PDF a partir dos snapshots históricos da venda", () => {
  const bytes = buildSaleReceiptPdf(sale, []);
  const content = new TextDecoder("latin1").decode(bytes);
  assert.equal(content.startsWith("%PDF-1.4"), true);
  assert.match(content, /Cliente hist.rico/);
  assert.match(content, /Pe.a desativada/);
  assert.match(content, /Desconto: 10%/);
  assert.match(content, /startxref/);
  assert.equal(getSaleReceiptPdfFilename(sale), "comprovante-000001.pdf");
});
