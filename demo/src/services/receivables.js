import { normalizeText } from "../utils/formatters.js";

const CUSTOMER_NAME_COLLATOR = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  usage: "sort"
});
const OUTSTANDING_STATUSES = new Set(["ABERTA", "PARCIAL", "VENCIDA"]);

export function isOutstandingReceivable(account) {
  return OUTSTANDING_STATUSES.has(account.situacao) && Number(account.saldoPendente) > 0;
}

export function getOutstandingReceivables(accounts) {
  return accounts.filter(isOutstandingReceivable);
}

export function calculateOutstandingBalance(accounts) {
  return accounts.reduce(
    (total, account) => total + (isOutstandingReceivable(account) ? Number(account.saldoPendente) || 0 : 0),
    0
  );
}

function customerKey(account) {
  return account.clienteId == null ? `conta:${account.id}` : `cliente:${account.clienteId}`;
}

function compareDueDates(first, second) {
  const firstDueDate = first.vencimento || "9999-12-31";
  const secondDueDate = second.vencimento || "9999-12-31";
  return firstDueDate.localeCompare(secondDueDate) || Number(first.id) - Number(second.id);
}

export function groupReceivablesByCustomer(accounts, search = "") {
  const groupsByCustomer = new Map();

  for (const account of getOutstandingReceivables(accounts)) {
    const key = customerKey(account);
    const group = groupsByCustomer.get(key) || {
      key,
      clienteId: account.clienteId,
      clienteNome: account.clienteNome || "Cliente não informado",
      quantidadeDividas: 0,
      saldoTotal: 0,
      contas: []
    };
    group.quantidadeDividas += 1;
    group.saldoTotal += Number(account.saldoPendente);
    group.contas.push(account);
    groupsByCustomer.set(key, group);
  }

  const normalizedSearch = normalizeText(search.trim());
  return [...groupsByCustomer.values()]
    .filter((group) => !normalizedSearch || normalizeText(group.clienteNome).includes(normalizedSearch))
    .map((group) => ({ ...group, contas: [...group.contas].sort(compareDueDates) }))
    .sort((first, second) => CUSTOMER_NAME_COLLATOR.compare(first.clienteNome, second.clienteNome)
      || String(first.clienteId ?? first.key).localeCompare(String(second.clienteId ?? second.key)));
}
