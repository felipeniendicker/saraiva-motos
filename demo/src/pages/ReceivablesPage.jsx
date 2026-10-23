import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "../data/domain.js";
import { listReceivables, receivePayment, reversePayment } from "../services/receivablesApi.js";
import { saveConsolidatedReceivablesPdf } from "../services/receivableConsolidatedPdf.js";
import { calculateOutstandingBalance, groupReceivablesByCustomer } from "../services/receivables.js";
import { saveReceivableStatementPdf } from "../services/receivableStatementPdf.js";
import { formatCivilDate, formatCurrency, formatDateTime } from "../utils/formatters.js";

const STATUS_LABELS = {
  ABERTA: "Aberta",
  PARCIAL: "Parcialmente paga",
  QUITADA: "Quitada",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada"
};

const EMPTY_PAYMENT = { id: null, valor: "", formaPagamento: "" };

function PaymentHistory({ account, onReverse }) {
  const payments = account.recebimentos || [];
  return <details className="receivable-payment-history">
    <summary>Histórico de pagamentos ({payments.length})</summary>
    {payments.length === 0
      ? <p className="receivable-empty-history">Nenhum pagamento registrado.</p>
      : payments.map((receipt) => <div className="receivable-history" key={receipt.id}>
        <span>{formatDateTime(receipt.dataHora)} · {PAYMENT_METHOD_LABELS[receipt.formaPagamento] || receipt.formaPagamento}</span>
        <strong>{formatCurrency(receipt.valor)} {receipt.estornado && "· Estornado"}</strong>
        {!receipt.estornado && <button className="ghost-button" type="button" onClick={() => onReverse(receipt)}>Estornar</button>}
      </div>)}
  </details>;
}

function PaymentForm({ account, payment, busy, onChange, onSubmit }) {
  if (payment.id !== account.id) return null;
  return <form className="receivable-payment" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <input
      aria-label={`Valor do pagamento da venda ${account.numeroVenda}`}
      type="number"
      min="0.01"
      max={account.saldoPendente}
      step="0.01"
      value={payment.valor}
      onChange={(event) => onChange({ ...payment, valor: event.target.value })}
      required
    />
    <select
      aria-label={`Forma de pagamento da venda ${account.numeroVenda}`}
      value={payment.formaPagamento}
      onChange={(event) => onChange({ ...payment, formaPagamento: event.target.value })}
      required
    >
      <option value="">Forma de pagamento</option>
      {PAYMENT_METHODS.filter((method) => method !== "A_PRAZO").map((method) => (
        <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>
      ))}
    </select>
    <button className="primary-button" disabled={busy || !payment.formaPagamento}>Confirmar</button>
  </form>;
}

function ReceivableAccount({ account, payment, busy, onPaymentChange, onPaymentSubmit, onReverse }) {
  const canReceive = Number(account.saldoPendente) > 0 && account.situacao !== "CANCELADA";
  return <article className="receivable-account">
    <div className="receivable-account-heading">
      <div>
        <span>Venda</span>
        <strong>{account.numeroVenda}</strong>
        <small>Vencimento: {formatCivilDate(account.vencimento)}</small>
      </div>
      <span className={`status-pill status-${account.situacao.toLowerCase()}`}>
        {STATUS_LABELS[account.situacao] || account.situacao}
      </span>
    </div>
    <div className="receivable-account-values">
      <span>Valor original <strong>{formatCurrency(account.valorOriginal)}</strong></span>
      <span>Total recebido <strong>{formatCurrency(account.valorRecebido)}</strong></span>
      <span>Saldo <strong>{formatCurrency(account.saldoPendente)}</strong></span>
    </div>
    <div className="form-actions-pro">
      <button className="secondary-button" type="button" onClick={() => saveReceivableStatementPdf(account)}>Salvar extrato PDF</button>
      {canReceive && <button
        className="primary-button"
        type="button"
        onClick={() => onPaymentChange({ id: account.id, valor: String(account.saldoPendente), formaPagamento: "" })}
      >Registrar pagamento</button>}
    </div>
    <PaymentForm
      account={account}
      payment={payment}
      busy={busy}
      onChange={onPaymentChange}
      onSubmit={onPaymentSubmit}
    />
    <PaymentHistory account={account} onReverse={onReverse} />
  </article>;
}

function CustomerReceivables({ group, ...accountActions }) {
  const debtLabel = group.quantidadeDividas === 1 ? "1 dívida" : `${group.quantidadeDividas} dívidas`;
  return <details className="receivable-customer-group">
    <summary>
      <div>
        <strong>{group.clienteNome}</strong>
        <span>{debtLabel}</span>
      </div>
      <div className="receivable-customer-financial">
        <span>Saldo total</span>
        <strong>{formatCurrency(group.saldoTotal)}</strong>
        <button
          className="secondary-button"
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            saveConsolidatedReceivablesPdf(group);
          }}
        >Imprimir todas as dívidas</button>
      </div>
    </summary>
    <div className="receivable-customer-accounts">
      {group.contas.map((account) => (
        <ReceivableAccount key={account.id} account={account} {...accountActions} />
      ))}
    </div>
  </details>;
}

export default function ReceivablesPage() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const attempts = useRef(new Map());

  async function load() {
    try {
      setAccounts(await listReceivables());
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  }

  useEffect(() => { load(); }, []);

  const customerGroups = useMemo(
    () => groupReceivablesByCustomer(accounts, search),
    [accounts, search]
  );
  const pending = calculateOutstandingBalance(accounts);
  const received = accounts.reduce((sum, account) => sum + Number(account.valorRecebido), 0);
  const overdue = accounts.filter((account) => account.situacao === "VENCIDA").length;

  async function submitPayment() {
    const payload = { valor: Number(payment.valor), formaPagamento: payment.formaPagamento };
    const signature = JSON.stringify(payload);
    const previous = attempts.current.get(payment.id);
    const attempt = previous?.signature === signature
      ? previous
      : { key: crypto.randomUUID(), signature };
    attempts.current.set(payment.id, attempt);
    setBusy(true);
    try {
      await receivePayment(payment.id, payload, attempt.key);
      attempts.current.delete(payment.id);
      setPayment(EMPTY_PAYMENT);
      await load();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function reversePaymentReceipt(receipt) {
    const reason = prompt("Motivo do estorno:");
    if (!reason) return;
    try {
      await reversePayment(receipt.id, reason);
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  }

  return <div className="page-stack">
    <div className="stats-grid">
      <div className="stat-card"><span>Total pendente</span><strong>{formatCurrency(pending)}</strong></div>
      <div className="stat-card"><span>Total recebido</span><strong>{formatCurrency(received)}</strong></div>
      <div className="stat-card"><span>Contas vencidas</span><strong>{overdue}</strong></div>
    </div>
    <Panel title="Contas a receber" description="Pagamentos efetivos são registrados no caixa aberto.">
      {error && <div className="feedback-message feedback-danger" role="alert">{error}</div>}
      {accounts.length === 0
        ? <EmptyState title="Nenhuma conta a receber" description="Vendas a prazo aparecerão aqui." />
        : <>
          <label className="receivables-search">
            Pesquisar cliente
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite o nome do cliente"
            />
          </label>
          {customerGroups.length === 0
            ? <EmptyState
              title={search ? "Nenhum cliente encontrado" : "Nenhuma dívida pendente"}
              description={search ? "Tente pesquisar por outro nome." : "Todas as contas estão quitadas ou não possuem saldo para cobrança."}
            />
            : <div className="receivables-list">
              {customerGroups.map((group) => <CustomerReceivables
                key={group.key}
                group={group}
                payment={payment}
                busy={busy}
                onPaymentChange={setPayment}
                onPaymentSubmit={submitPayment}
                onReverse={reversePaymentReceipt}
              />)}
            </div>}
        </>}
    </Panel>
  </div>;
}
