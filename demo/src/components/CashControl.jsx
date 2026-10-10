import { useEffect, useState } from "react";
import Panel from "./Panel.jsx";
import { closeCash, getCurrentCash, listCashHistory, moveCash, openCash } from "../services/cashApi.js";
import { formatCurrency, formatDateTime } from "../utils/formatters.js";

const PAYMENT_LABELS = { totalDinheiro: "Dinheiro", totalPix: "PIX", totalCartaoDebito: "Cartão de débito", totalCartaoCredito: "Cartão de crédito", totalOutro: "Outro" };
export default function CashControl() {
  const [cash, setCash] = useState(null); const [history, setHistory] = useState([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState("0"); const [movement, setMovement] = useState({ tipo: "ENTRADA_AVULSA", valor: "", descricao: "" }); const [counted, setCounted] = useState("");
  async function load() { try { const [current, past] = await Promise.all([getCurrentCash(), listCashHistory()]); setCash(current); setHistory(past || []); setError(""); } catch (e) { setError(e.message); } }
  useEffect(() => { load(); }, []);
  async function run(action) { if (busy) return; setBusy(true); try { await action(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <Panel title="Controle de caixa" description="Dinheiro físico separado de PIX e cartões.">
    {error && <div className="feedback-message feedback-danger" role="alert">{error}</div>}
    {!cash ? <form className="cash-form" onSubmit={(e) => { e.preventDefault(); run(() => openCash(Number(opening))); }}>
      <label>Valor inicial<input type="number" min="0" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} required /></label>
      <button className="primary-button" disabled={busy}>Abrir caixa</button>
    </form> : <div className="cash-current">
      <div className="cash-header"><div><span>Caixa aberto por {cash.operadorAberturaEmail}</span><strong>{formatCurrency(cash.saldoEsperado)}</strong><small>Saldo físico esperado</small></div><span className="status-pill status-aprovado">Aberto</span></div>
      <div className="cash-totals">{Object.entries(PAYMENT_LABELS).map(([key,label]) => <div key={key}><span>{label}</span><strong>{formatCurrency(cash[key])}</strong></div>)}</div>
      <form className="cash-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await moveCash(cash.id, { ...movement, valor: Number(movement.valor) }); setMovement({ tipo:"ENTRADA_AVULSA",valor:"",descricao:"" }); }); }}>
        <select value={movement.tipo} onChange={(e) => setMovement({...movement,tipo:e.target.value})}><option value="ENTRADA_AVULSA">Entrada avulsa</option><option value="SAIDA_AVULSA">Saída avulsa</option></select>
        <input type="number" min="0.01" step="0.01" placeholder="Valor" value={movement.valor} onChange={(e) => setMovement({...movement,valor:e.target.value})} required />
        <input maxLength="255" placeholder="Motivo" value={movement.descricao} onChange={(e) => setMovement({...movement,descricao:e.target.value})} required />
        <button className="secondary-button" disabled={busy}>Registrar</button>
      </form>
      <form className="cash-form cash-close" onSubmit={(e) => { e.preventDefault(); if (confirm("Confirmar fechamento do caixa?")) run(() => closeCash(cash.id, Number(counted))); }}>
        <input type="number" min="0" step="0.01" placeholder="Valor contado" value={counted} onChange={(e) => setCounted(e.target.value)} required />
        <button className="primary-button" disabled={busy}>Fechar caixa</button>
      </form>
    </div>}
    <details className="cash-history"><summary>Histórico de caixas</summary>{history.map((item) => <article key={item.id}><span>{formatDateTime(item.dataAbertura)} · {item.operadorAberturaEmail}</span><strong>{item.status === "FECHADO" ? `Diferença: ${formatCurrency(item.diferenca)}` : "Aberto"}</strong></article>)}</details>
  </Panel>;
}
