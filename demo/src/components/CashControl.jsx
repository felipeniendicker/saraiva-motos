import { useCallback, useEffect, useState } from "react";
import Panel from "./Panel.jsx";
import { closeCash, getCurrentCash, listCashHistory, moveCash, openCash } from "../services/cashApi.js";
import { saveCashClosingPdf } from "../services/cashClosingPdf.js";
import { formatCurrency, formatDateTime } from "../utils/formatters.js";

const PAYMENT_TOTALS = [
  ["totalDinheiro", "Dinheiro"],
  ["totalPix", "PIX"],
  ["totalCartaoDebito", "Cartão de débito"],
  ["totalCartaoCredito", "Cartão de crédito"],
  ["totalOutro", "Outras formas"]
];

function FinancialSummary({ cash, compact = false }) {
  return <div className={`cash-financial-summary${compact ? " is-compact" : ""}`}>
    <div className="cash-summary-highlight"><span>Total bruto recebido</span><strong>{formatCurrency(cash.totalRecebido)}</strong></div>
    {PAYMENT_TOTALS.map(([key, label]) => <div key={key}><span>{label}</span><strong>{formatCurrency(cash[key])}</strong></div>)}
    <div><span>Estornos/devoluções</span><strong>{formatCurrency(cash.totalEstornos)}</strong></div>
    <div className="cash-summary-highlight"><span>Total líquido recebido</span><strong>{formatCurrency(cash.totalRecebidoLiquido)}</strong></div>
    <div><span>Valor inicial</span><strong>{formatCurrency(cash.valorInicial)}</strong></div>
    <div><span>Entradas avulsas</span><strong>{formatCurrency(cash.totalEntradasAvulsas)}</strong></div>
    <div><span>Saídas avulsas</span><strong>{formatCurrency(cash.totalSaidasAvulsas)}</strong></div>
    <div className="cash-summary-highlight"><span>Saldo físico esperado</span><strong>{formatCurrency(cash.saldoEsperado)}</strong></div>
  </div>;
}

function CashHistory({ history }) {
  return <details className="cash-history">
    <summary>Histórico de caixas</summary>
    <div className="cash-history-list">{history.map((item) => <details key={item.id} className="cash-history-item">
      <summary><span>{formatDateTime(item.dataAbertura)} · {item.operadorAberturaEmail}</span><strong>{item.status === "FECHADO" ? `Diferença: ${formatCurrency(item.diferenca)}` : "Aberto"}</strong></summary>
      <div className="cash-history-details">
        <p>Fechamento: <strong>{formatDateTime(item.dataFechamento, "Caixa ainda aberto")}</strong></p>
        <p>Operador de fechamento: <strong>{item.operadorFechamentoEmail || "Caixa ainda aberto"}</strong></p>
        <FinancialSummary cash={item} compact />
        <div className="cash-closing-values">
          <span>Valor contado <strong>{formatCurrency(item.valorContado)}</strong></span>
          <span>Diferença <strong>{formatCurrency(item.diferenca)}</strong></span>
        </div>
        <button type="button" className="secondary-button" onClick={() => saveCashClosingPdf(item)}>Salvar fechamento em PDF</button>
      </div>
    </details>)}</div>
  </details>;
}

export default function CashControl() {
  const [cash, setCash] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [opening, setOpening] = useState("0");
  const [movement, setMovement] = useState({ tipo: "ENTRADA_AVULSA", valor: "", descricao: "" });
  const [counted, setCounted] = useState("");

  const load = useCallback(async (showProgress = false) => {
    if (showProgress) setRefreshing(true);
    try {
      const [current, past] = await Promise.all([getCurrentCash(), listCashHistory()]);
      setCash(current);
      setHistory(past || []);
      setLastUpdated(new Date());
      setError("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      if (showProgress) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(), 30000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    try { await action(); await load(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  const updateAction = <div className="cash-refresh">
    <span>{lastUpdated ? `Atualizado em ${formatDateTime(lastUpdated)}` : "Aguardando atualização"}</span>
    <button type="button" className="secondary-button" disabled={refreshing} onClick={() => load(true)}>{refreshing ? "Atualizando..." : "Atualizar caixa"}</button>
  </div>;

  return <Panel title="Controle de caixa" description="Recebimentos comerciais separados do dinheiro físico." action={updateAction}>
    {error && <div className="feedback-message feedback-danger" role="alert">{error}</div>}
    {!cash ? <form className="cash-form" onSubmit={(event) => { event.preventDefault(); run(() => openCash(Number(opening))); }}>
      <label>Valor inicial<input type="number" min="0" step="0.01" value={opening} onChange={(event) => setOpening(event.target.value)} required /></label>
      <button className="primary-button" disabled={busy}>Abrir caixa</button>
    </form> : <div className="cash-current">
      <div className="cash-header"><div><span>Caixa aberto por {cash.operadorAberturaEmail}</span><strong>{formatCurrency(cash.saldoEsperado)}</strong><small>Saldo físico esperado em dinheiro</small></div><span className="status-pill status-aprovado">Aberto</span></div>
      <FinancialSummary cash={cash} />
      <form className="cash-form" onSubmit={(event) => { event.preventDefault(); run(async () => { await moveCash(cash.id, { ...movement, valor: Number(movement.valor) }); setMovement({ tipo: "ENTRADA_AVULSA", valor: "", descricao: "" }); }); }}>
        <select value={movement.tipo} onChange={(event) => setMovement({ ...movement, tipo: event.target.value })}><option value="ENTRADA_AVULSA">Entrada avulsa</option><option value="SAIDA_AVULSA">Saída avulsa</option></select>
        <input type="number" min="0.01" step="0.01" placeholder="Valor" value={movement.valor} onChange={(event) => setMovement({ ...movement, valor: event.target.value })} required />
        <input maxLength="255" placeholder="Motivo" value={movement.descricao} onChange={(event) => setMovement({ ...movement, descricao: event.target.value })} required />
        <button className="secondary-button" disabled={busy}>Registrar</button>
      </form>
      <form className="cash-form cash-close" onSubmit={(event) => { event.preventDefault(); if (confirm("Confirmar fechamento do caixa?")) run(() => closeCash(cash.id, Number(counted))); }}>
        <input type="number" min="0" step="0.01" placeholder="Valor contado" value={counted} onChange={(event) => setCounted(event.target.value)} required />
        <button className="primary-button" disabled={busy}>Fechar caixa</button>
      </form>
    </div>}
    <CashHistory history={history} />
  </Panel>;
}
