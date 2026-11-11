import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "../data/domain.js";
import { cancelOrder, changeOrderStatus, finalizeOrder, listOrders } from "../services/ordersApi.js";
import { formatCivilDate, formatCurrency, formatDateTime } from "../utils/formatters.js";

const STATUS_LABELS = {
  PENDENTE: "Pendente", CONFIRMADO: "Confirmado", PRONTO: "Pronto",
  FINALIZADO: "Finalizado", CANCELADO: "Cancelado"
};
const NEXT_STATUS = { PENDENTE: "CONFIRMADO", CONFIRMADO: "PRONTO" };
const EMPTY_FINALIZATION = { id: null, paymentMethod: "", dueDate: "", initialPayment: "0", initialPaymentMethod: "" };

function OrderDetails({ order }) {
  return <details className="order-details">
    <summary>Ver detalhes e histórico</summary>
    <div className="order-links">
      <span>Orçamento de origem <strong>{order.orcamentoId ? `#${order.orcamentoId}` : "Não informado"}</strong></span>
      <span>Venda gerada <strong>{order.vendaId ? `#${order.vendaId}` : "Ainda não gerada"}</strong></span>
      <span>Operador <strong>{order.operadorEmail}</strong></span>
      <span>Previsão de retirada <strong>{order.previsaoRetirada ? formatCivilDate(order.previsaoRetirada) : "Não informada"}</strong></span>
    </div>
    <div className="order-items">{order.itens.map((item) => <div key={item.id}>
      <span>{item.quantidade} × {item.descricaoItem}</span><strong>{formatCurrency(item.subtotal)}</strong>
    </div>)}</div>
    {order.observacoes && <p><strong>Observações:</strong> {order.observacoes}</p>}
    <ol className="order-history">{order.historico.map((entry) => <li key={entry.id || `${entry.statusNovo}-${entry.dataHora}`}>
      <span>{formatDateTime(entry.dataHora)}</span><strong>{STATUS_LABELS[entry.statusNovo] || entry.statusNovo}</strong>
      <small>{entry.operadorEmail}{entry.observacao ? ` · ${entry.observacao}` : ""}</small>
    </li>)}</ol>
  </details>;
}

function FinalizationForm({ order, value, busy, onChange, onSubmit, onClose }) {
  if (value.id !== order.id) return null;
  const credit = value.paymentMethod === "A_PRAZO";
  return <form className="order-finalization" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <label>Pagamento<select value={value.paymentMethod} onChange={(event) => onChange({ ...value, paymentMethod: event.target.value })} required>
      <option value="">Selecione</option>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
    </select></label>
    {credit && <>
      <label>Vencimento<input type="date" value={value.dueDate} onChange={(event) => onChange({ ...value, dueDate: event.target.value })} required /></label>
      <label>Entrada<input type="number" min="0" max={order.total} step="0.01" value={value.initialPayment} onChange={(event) => onChange({ ...value, initialPayment: event.target.value })} /></label>
      {Number(value.initialPayment) > 0 && <label>Forma da entrada<select value={value.initialPaymentMethod} onChange={(event) => onChange({ ...value, initialPaymentMethod: event.target.value })} required>
        <option value="">Selecione</option>{PAYMENT_METHODS.filter((method) => method !== "A_PRAZO").map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
      </select></label>}
    </>}
    <div className="form-actions-pro"><button className="primary-button" disabled={busy}>{busy ? "Finalizando..." : "Confirmar e gerar venda"}</button>
      <button className="ghost-button" type="button" onClick={onClose}>Voltar</button></div>
  </form>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [finalization, setFinalization] = useState(EMPTY_FINALIZATION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const attempts = useRef(new Map());

  async function load() {
    try { setOrders(await listOrders()); setError(""); }
    catch (failure) { setError(failure.message); }
  }
  useEffect(() => { load(); }, []);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return orders.filter((order) => (!status || order.status === status)
      && (!term || order.numero.toLocaleLowerCase("pt-BR").includes(term)
        || order.clienteNome.toLocaleLowerCase("pt-BR").includes(term)));
  }, [orders, search, status]);

  async function moveStatus(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusy(true);
    try { await changeOrderStatus(order.id, { status: next, observacao: null }); setNotice(`Pedido ${order.numero} atualizado.`); await load(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function cancel(order) {
    if (!globalThis.confirm(`Cancelar o pedido ${order.numero}?`)) return;
    const reason = globalThis.prompt("Motivo do cancelamento:");
    if (!reason?.trim()) return;
    setBusy(true);
    try { await cancelOrder(order.id, reason.trim()); setNotice(`Pedido ${order.numero} cancelado.`); await load(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function submitFinalization() {
    const order = orders.find((candidate) => candidate.id === finalization.id);
    if (!order) return;
    const credit = finalization.paymentMethod === "A_PRAZO";
    const payload = {
      formaPagamento: credit ? "OUTRO" : finalization.paymentMethod,
      condicaoPagamento: credit ? "A_PRAZO" : "IMEDIATO",
      vencimento: credit ? finalization.dueDate : null,
      pagamentoInicial: credit ? Number(finalization.initialPayment || 0) : null,
      formaPagamentoInicial: credit && Number(finalization.initialPayment) > 0 ? finalization.initialPaymentMethod : null,
      observacoes: null
    };
    const signature = JSON.stringify(payload);
    const previous = attempts.current.get(order.id);
    const attempt = previous?.signature === signature ? previous : { key: crypto.randomUUID(), signature };
    attempts.current.set(order.id, attempt);
    setBusy(true);
    try {
      const sale = await finalizeOrder(order.id, payload, attempt.key);
      attempts.current.delete(order.id);
      setFinalization(EMPTY_FINALIZATION);
      setNotice(`Pedido ${order.numero} finalizado na venda ${sale.numeroVenda}.`);
      await load();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <div className="page-stack orders-page"><Panel title="Pedidos de clientes" description="Pedidos não reservam estoque e só geram movimentações quando são finalizados em venda.">
    {error && <div className="feedback-message feedback-danger" role="alert">{error}</div>}
    {notice && <div className="feedback-message feedback-success" role="status">{notice}</div>}
    <div className="order-filters"><label>Buscar por número ou cliente<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="PED-000001 ou nome do cliente" /></label>
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {visibleOrders.length === 0 ? <EmptyState title="Nenhum pedido encontrado" description="Converta um orçamento com cliente cadastrado para criar o primeiro pedido." />
      : <div className="orders-list">{visibleOrders.map((order) => <article className="order-card" key={order.id}>
        <div className="order-card-heading"><div><small>{formatDateTime(order.dataCriacao)}</small><strong>{order.numero}</strong><span>{order.clienteNome}</span></div>
          <span className={`status-pill status-${order.status.toLowerCase()}`}>{STATUS_LABELS[order.status]}</span><strong>{formatCurrency(order.total)}</strong></div>
        <div className="form-actions-pro">
          {NEXT_STATUS[order.status] && <button className="secondary-button" disabled={busy} onClick={() => moveStatus(order)}>Marcar como {STATUS_LABELS[NEXT_STATUS[order.status]].toLowerCase()}</button>}
          {order.status === "PRONTO" && <button className="primary-button" disabled={busy} onClick={() => setFinalization({ ...EMPTY_FINALIZATION, id: order.id, paymentMethod: order.condicaoPagamentoPrevista === "A_PRAZO" ? "A_PRAZO" : order.formaPagamentoPrevista || "", dueDate: order.vencimentoPrevisto || "", initialPayment: String(order.entradaPrevista || 0), initialPaymentMethod: order.formaPagamentoEntradaPrevista || "" })}>Finalizar pedido / Gerar venda</button>}
          {!['FINALIZADO', 'CANCELADO'].includes(order.status) && <button className="danger-button" disabled={busy} onClick={() => cancel(order)}>Cancelar</button>}
        </div>
        <FinalizationForm order={order} value={finalization} busy={busy} onChange={setFinalization} onSubmit={submitFinalization} onClose={() => setFinalization(EMPTY_FINALIZATION)} />
        <OrderDetails order={order} />
      </article>)}</div>}
  </Panel></div>;
}
