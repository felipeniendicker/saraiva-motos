import test from "node:test";
import assert from "node:assert/strict";
import { groupReceivablesByCustomer } from "./receivables.js";

function account(overrides = {}) {
  return {
    id: 1,
    clienteId: 10,
    clienteNome: "Anderson Barbearia",
    numeroVenda: "000010",
    vencimento: "2026-11-10",
    situacao: "ABERTA",
    saldoPendente: 600,
    ...overrides
  };
}

test("mantém um cliente com uma dívida em um único grupo", () => {
  const debt = account();
  const groups = groupReceivablesByCustomer([debt]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].contas.length, 1);
  assert.equal(groups[0].contas[0], debt);
  assert.equal(groups[0].saldoTotal, 600);
});

test("agrupa várias dívidas pelo clienteId e soma somente a apresentação", () => {
  const first = account({ id: 59, numeroVenda: "000059", saldoPendente: 253 });
  const second = account({ id: 10, numeroVenda: "000010", saldoPendente: 600 });
  const groups = groupReceivablesByCustomer([first, second]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].contas.length, 2);
  assert.equal(groups[0].saldoTotal, 853);
  assert.equal(first.saldoPendente, 253);
  assert.equal(second.saldoPendente, 600);
});

test("não mistura clientes diferentes com o mesmo nome", () => {
  const groups = groupReceivablesByCustomer([
    account({ id: 1, clienteId: 10, clienteNome: "Cliente Igual" }),
    account({ id: 2, clienteId: 20, clienteNome: "Cliente Igual" })
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.clienteId), [10, 20]);
});

test("ordena clientes sem considerar acentos ou caixa e pesquisa enquanto digita", () => {
  const accounts = [
    account({ id: 1, clienteId: 1, clienteNome: "zélia" }),
    account({ id: 2, clienteId: 2, clienteNome: "Álvaro" }),
    account({ id: 3, clienteId: 3, clienteNome: "bruno" })
  ];

  assert.deepEqual(
    groupReceivablesByCustomer(accounts).map((group) => group.clienteNome),
    ["Álvaro", "bruno", "zélia"]
  );
  assert.deepEqual(
    groupReceivablesByCustomer(accounts, "alv").map((group) => group.clienteId),
    [2]
  );
});

test("ordena dívidas do cliente pelos vencimentos mais próximos", () => {
  const groups = groupReceivablesByCustomer([
    account({ id: 3, vencimento: "2026-12-01" }),
    account({ id: 1, vencimento: "2026-10-25" }),
    account({ id: 2, vencimento: "2026-11-01" })
  ]);

  assert.deepEqual(groups[0].contas.map((item) => item.id), [1, 2, 3]);
});

test("pagamento parcial ou quitação altera apenas a conta correspondente", () => {
  const first = account({ id: 1, saldoPendente: 100 });
  const second = account({ id: 2, saldoPendente: 200 });
  const partial = groupReceivablesByCustomer([{ ...first, saldoPendente: 40 }, second])[0];
  const paid = groupReceivablesByCustomer([{ ...first, saldoPendente: 0 }, second])[0];

  assert.deepEqual(partial.contas.map((item) => item.saldoPendente), [40, 200]);
  assert.equal(partial.saldoTotal, 240);
  assert.deepEqual(paid.contas.map((item) => item.saldoPendente), [0, 200]);
  assert.equal(paid.saldoTotal, 200);
});

test("não inclui contas quitadas ou canceladas no saldo e na quantidade de dívidas", () => {
  const groups = groupReceivablesByCustomer([
    account({ id: 1, situacao: "ABERTA", saldoPendente: 100 }),
    account({ id: 2, situacao: "QUITADA", saldoPendente: 0 }),
    account({ id: 3, situacao: "CANCELADA", saldoPendente: 300 })
  ]);

  assert.equal(groups[0].contas.length, 3);
  assert.equal(groups[0].quantidadeDividas, 1);
  assert.equal(groups[0].saldoTotal, 100);
});
