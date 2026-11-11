import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConsolidatedWhatsAppMessage,
  buildReceivableWhatsAppMessage,
  shareReceivablePdf
} from "./receivableWhatsApp.js";

const company = { nomeFantasia: "SARAIVA MOTOS" };

test("mensagens individual e consolidada apresentam os totais atuais", () => {
  const individual = buildReceivableWhatsAppMessage({
    clienteNome: "Ana Cliente",
    numeroVenda: "000123",
    valorOriginal: 600,
    valorRecebido: 300,
    saldoPendente: 300
  }, company);
  const consolidated = buildConsolidatedWhatsAppMessage({
    clienteNome: "Ana Cliente",
    clienteId: 9,
    valorOriginalTotal: 900,
    totalRecebido: 300,
    saldoTotal: 600
  }, company);

  assert.match(individual, /SARAIVA MOTOS/);
  assert.match(individual, /000123/);
  assert.match(individual, /Saldo pendente: R\$\s300,00/);
  assert.match(consolidated, /Total original: R\$\s900,00/);
  assert.match(consolidated, /Saldo pendente: R\$\s600,00/);
});

test("compartilha o PDF nativamente quando arquivos são suportados", async () => {
  const shared = [];
  class MockFile {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options.type;
    }
  }
  const result = await shareReceivablePdf({
    bytes: new Uint8Array([1, 2]),
    filename: "extrato.pdf",
    message: "Mensagem"
  }, {
    FileClass: MockFile,
    navigatorObject: {
      canShare: ({ files }) => files[0].name === "extrato.pdf",
      share: async (payload) => shared.push(payload)
    },
    download: () => assert.fail("não deveria baixar")
  });

  assert.equal(result, "shared");
  assert.equal(shared[0].files[0].type, "application/pdf");
});

test("baixa o PDF e abre WhatsApp quando anexo nativo não é suportado", async () => {
  const downloads = [];
  const opened = [];
  const result = await shareReceivablePdf({
    bytes: new Uint8Array([1, 2]),
    filename: "extrato.pdf",
    message: "Saldo pendente: R$ 300,00"
  }, {
    navigatorObject: {},
    windowObject: { open: (...args) => opened.push(args) },
    download: (...args) => downloads.push(args)
  });

  assert.equal(result, "downloaded");
  assert.equal(downloads[0][1], "extrato.pdf");
  assert.match(opened[0][0], /^https:\/\/wa\.me\/\?text=/);
  assert.match(decodeURIComponent(opened[0][0]), /Saldo pendente: R\$ 300,00/);
  assert.equal(opened[0][2], "noopener,noreferrer");
});
