import test from "node:test";
import assert from "node:assert/strict";
import { buildQuotePdf } from "./quotePdf.js";

function quote(overrides = {}) {
  return {
    numero: "ORC-000001",
    dataEmissao: "2026-10-16T10:00:00",
    validade: "2026-10-30",
    clienteNome: "Cliente da oficina",
    operadorEmail: "vendedor@saraiva.test",
    itens: [{
      quantidade: 1,
      codigoItem: "REF-01",
      descricaoItem: "Revisão completa",
      precoUnitario: 100,
      subtotal: 100
    }],
    subtotal: 100,
    descontoPercentual: 0,
    desconto: 0,
    total: 100,
    ...overrides
  };
}

function content(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

function pageHeight(pdfContent) {
  return Number(pdfContent.match(/\/MediaBox \[0 0 226\.77 ([\d.]+)\]/)?.[1]);
}

test("PDF do orçamento usa papel 80 mm, fundo branco e identificação completa", () => {
  const pdf = content(buildQuotePdf(quote()));
  assert.match(pdf, /\/MediaBox \[0 0 226\.77/);
  assert.match(pdf, /SARAIVA MOTOS/);
  assert.match(pdf, /SARAIVA MOTO PE.AS/);
  assert.match(pdf, /CNPJ:/);
  assert.match(pdf, /OR.AMENTO/);
  assert.match(pdf, /DESCRI..O \/ QTD\. x UNIT\./);
  assert.match(pdf, /Este or.amento n.o reserva estoque/);
  assert.doesNotMatch(pdf, /\bre\s+f\b|\brg\b/);
});

test("altura do orçamento cresce com itens e descrições longas", () => {
  const shortPdf = content(buildQuotePdf(quote()));
  const longDescription = "Kit completo para revisão preventiva da motocicleta com descrição extensa e aplicação detalhada sem cortar palavras nas laterais";
  const longPdf = content(buildQuotePdf(quote({
    itens: Array.from({ length: 8 }, (_, index) => ({
      quantidade: index + 1,
      codigoItem: `REF-${index + 1}`,
      descricaoItem: longDescription,
      precoUnitario: 100,
      subtotal: (index + 1) * 100
    }))
  })));
  assert.ok(pageHeight(longPdf) > pageHeight(shortPdf));
  assert.match(longPdf, /aplica..o detalhada/);
});
