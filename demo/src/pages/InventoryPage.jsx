import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Panel from "../components/Panel.jsx";
import { STOCK_MOVEMENT_TYPES } from "../data/domain.js";
import { filterStockMovements, getStockStatus, searchOperationalProducts } from "../services/inventory.js";
import { listProducts } from "../services/productsApi.js";
import { addStock, adjustStock, listStockMovements, removeStock } from "../services/stockApi.js";

const initialForm = { produtoId: "", operacao: "ENTRADA", valor: "1", motivo: "" };
const initialFilters = { productId: "", type: "", dateFrom: "", dateTo: "" };
const movementLabels = {
  ENTRADA: "Entrada", SAIDA_VENDA: "Saída por venda", AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SAIDA: "Ajuste de saída", SAIDA_MANUAL: "Saída manual", CANCELAMENTO_VENDA: "Cancelamento de venda"
};

function isEntry(type) {
  return ["ENTRADA", "AJUSTE_ENTRADA", "CANCELAMENTO_VENDA"].includes(type);
}

function formatDateTime(value) {
  if (!value) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function InventoryPage() {
  const [form, setForm] = useState(initialForm);
  const [productSearch, setProductSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [apiProducts, setApiProducts] = useState([]);
  const [apiMovements, setApiMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const products = apiProducts;
  const activeProducts = useMemo(() => searchOperationalProducts(products, productSearch), [products, productSearch]);
  const lowStock = products.filter((product) => product.ativo && product.quantidadeEstoque <= product.estoqueMinimo);
  const selected = products.find((product) => String(product.id) === String(form.produtoId));
  const movements = useMemo(() => {
    return filterStockMovements(apiMovements, filters);
  }, [apiMovements, filters]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  async function loadApiData() {
    const [loadedProducts, loadedMovements] = await Promise.all([
      listProducts({ includeInactive: true }), listStockMovements()
    ]);
    setApiProducts(loadedProducts);
    setApiMovements(loadedMovements);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([listProducts({ includeInactive: true }), listStockMovements()])
      .then(([loadedProducts, loadedMovements]) => {
        if (!active) return;
        setApiProducts(loadedProducts);
        setApiMovements(loadedMovements);
        setFeedback(null);
      })
      .catch((error) => active && setFeedback({ type: "danger", message: error.message || "Não foi possível carregar o estoque." }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function retryLoad() {
    setLoading(true);
    try {
      await loadApiData();
      setFeedback(null);
    } catch (error) {
      setFeedback({ type: "danger", message: error.message || "Não foi possível carregar o estoque." });
    } finally {
      setLoading(false);
    }
  }

  function changeOperation(operation) {
    setForm((current) => ({ ...current, operacao: operation, valor: operation === "AJUSTE" ? "0" : "1", motivo: "" }));
    setFeedback(null);
  }

  async function processMovement(request) {
    setLoading(true);
    try {
      if (request.operation === "ENTRADA") await addStock({ produtoId: request.productId, quantidade: request.value, observacao: request.reason });
      if (request.operation === "AJUSTE") await adjustStock({ produtoId: request.productId, novoSaldo: request.value, motivo: request.reason });
      if (request.operation === "SAIDA") await removeStock({ produtoId: request.productId, quantidade: request.value, motivo: request.reason });
      await loadApiData();
      setFeedback({ type: "success", message: "Movimentação registrada com sucesso." });
      setForm(initialForm);
    } catch (error) {
      setFeedback({ type: "danger", message: error.message || "Não foi possível registrar a movimentação." });
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    const value = Number(form.valor);
    if (!selected) return setFeedback({ type: "warning", message: "Selecione um produto ativo." });
    if (!Number.isInteger(value) || value < (form.operacao === "AJUSTE" ? 0 : 1)) {
      return setFeedback({ type: "warning", message: form.operacao === "AJUSTE" ? "O novo saldo deve ser um número inteiro não negativo." : "A quantidade deve ser um número inteiro maior que zero." });
    }
    if (form.operacao === "AJUSTE" && value === selected.quantidadeEstoque) return setFeedback({ type: "warning", message: "O novo saldo deve ser diferente do estoque atual." });
    if (["AJUSTE", "SAIDA"].includes(form.operacao) && !form.motivo.trim()) return setFeedback({ type: "warning", message: "Informe o motivo da movimentação." });
    if (form.operacao === "SAIDA" && value > selected.quantidadeEstoque) return setFeedback({ type: "danger", message: `Estoque insuficiente. Disponível: ${selected.quantidadeEstoque} unidade(s).` });
    const request = { operation: form.operacao, productId: Number(form.produtoId), productName: selected.nome, previousBalance: selected.quantidadeEstoque, value, reason: form.motivo };
    if (["AJUSTE", "SAIDA"].includes(form.operacao)) return setConfirmation(request);
    await processMovement(request);
  }

  if (loading && products.length === 0 && apiMovements.length === 0) {
    return <Panel title="Carregando estoque" description="Consultando saldos, alertas e movimentações."><div className="section-loading" role="status"><span className="loading-indicator" aria-hidden="true" />Aguarde um instante...</div></Panel>;
  }
  if (feedback?.type === "danger" && products.length === 0 && apiMovements.length === 0) {
    return <Panel title="Estoque indisponível" description={feedback.message} action={<button type="button" className="primary-button" onClick={retryLoad}>Tentar novamente</button>}><p className="pdv-load-error" role="alert">Não foi possível consultar os saldos e movimentações atuais.</p></Panel>;
  }

  return <div className="page-stack inventory-page">
    {feedback && <div className={`feedback-message feedback-${feedback.type}`} role={feedback.type === "danger" ? "alert" : "status"}>{feedback.message}</div>}
    <div className="dashboard-layout inventory-overview">
      <section className="inventory-movement-section">
      <Panel title="Movimentar estoque" description="Registre entrada, ajuste por contagem ou saída sem venda.">
        <form className="form-grid-pro" onSubmit={submit}>
          <label className="field-wide">Localizar produto<input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Nome, referência, código, marca, categoria ou aplicação" /></label>
          <label className="field-wide">Produto<select value={form.produtoId} onChange={(event) => setForm((current) => ({ ...current, produtoId: event.target.value }))} required><option value="">Selecione</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.nome} · atual: {product.quantidadeEstoque}</option>)}</select></label>
          {selected && <div className="stock-current-balance field-wide"><span>Estoque atual</span><strong>{selected.quantidadeEstoque} unidade(s)</strong></div>}
          <label>Operação<select value={form.operacao} onChange={(event) => changeOperation(event.target.value)}><option value="ENTRADA">Entrada</option><option value="AJUSTE">Ajustar saldo contado</option><option value="SAIDA">Saída manual</option></select></label>
          <label>{form.operacao === "AJUSTE" ? "Novo saldo contado" : "Quantidade"}<input type="number" inputMode="numeric" step="1" min={form.operacao === "AJUSTE" ? "0" : "1"} value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))} required /></label>
          <label className="field-wide">{form.operacao === "ENTRADA" ? "Observação / referência" : "Motivo"}<input value={form.motivo} maxLength="255" onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))} placeholder={form.operacao === "ENTRADA" ? "Ex.: Compra, nota fiscal..." : form.operacao === "SAIDA" ? "Ex.: Uso interno da oficina..." : "Ex.: Correção após inventário..."} required={form.operacao !== "ENTRADA"} /></label>
          <div className="form-actions-pro field-wide"><button className={form.operacao === "SAIDA" ? "danger-button" : form.operacao === "AJUSTE" ? "secondary-button stock-adjust-button" : "primary-button"} disabled={loading}>{loading ? "Processando..." : form.operacao === "SAIDA" ? "Confirmar saída manual" : form.operacao === "AJUSTE" ? "Confirmar ajuste de saldo" : "Registrar entrada"}</button></div>
        </form>
      </Panel>
      </section>
      <section className="inventory-alerts-section">
      <Panel title={`Estoque baixo (${lowStock.length})`} description="Produtos ativos na quantidade mínima ou abaixo dela.">
        {lowStock.length === 0 ? <EmptyState title="Estoque em dia" description="Nenhum produto ativo está abaixo do mínimo." /> : <div className="timeline-list">{lowStock.map((product) => {
          const status = getStockStatus(product);
          return <article key={product.id} className={`timeline-item stock-alert-item alert-${status === "SEM_ESTOQUE" ? "empty" : "low"}`}><span className={`status-pill ${status === "SEM_ESTOQUE" ? "status-cancelado" : "status-pendente"}`}>{status === "SEM_ESTOQUE" ? "Sem estoque" : "Estoque baixo"}</span><div><strong>{product.nome}</strong><p>{product.codigoReferencia || "Sem referência"} · {product.marca || "Sem marca"} · mínimo {product.estoqueMinimo}</p></div><strong>{product.quantidadeEstoque} un.</strong></article>;
        })}</div>}
      </Panel>
      </section>
    </div>
    <Panel title="Histórico de movimentações" description="Entradas e saídas registradas com os saldos de estoque.">
      <details className="stock-filters-panel" open>
      <summary>Filtros {activeFilterCount > 0 ? `· ${activeFilterCount} ativo(s)` : "· nenhum ativo"}</summary>
      <div className="stock-history-filters">
        <label>Produto<select value={filters.productId} onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}><option value="">Todos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nome}</option>)}</select></label>
        <label>Tipo<select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}><option value="">Todos</option>{STOCK_MOVEMENT_TYPES.map((type) => <option key={type} value={type}>{movementLabels[type]}</option>)}</select></label>
        <label>De<input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} /></label>
        <label>Até<input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} /></label>
        <button type="button" className="secondary-button" onClick={() => setFilters(initialFilters)}>Limpar filtros</button>
      </div>
      </details>
      {loading && movements.length === 0 ? <p>Carregando movimentações...</p> : movements.length === 0 ? <EmptyState title="Nenhuma movimentação" description="Nenhuma movimentação corresponde aos filtros informados." /> : <div className="table-like">{movements.map((movement) => {
        const product = products.find((item) => String(item.id) === String(movement.produtoId));
        const previous = movement.saldoAnterior ?? movement.estoqueAnterior;
        const next = movement.saldoPosterior ?? movement.estoquePosterior;
        return <article key={movement.id} className="table-row stock-row"><span className={`movement-badge movement-${isEntry(movement.tipo) ? "in" : "out"}`}>{movementLabels[movement.tipo] || movement.tipo}</span><div><strong>{movement.produtoNome || product?.nome || "Produto não encontrado"}</strong><p>{movement.motivo || "Sem observação"}{movement.vendaId ? ` · venda #${movement.vendaId}` : ""}</p></div><div><span>Data/hora</span><strong>{formatDateTime(movement.dataHora)}</strong></div><div><span>Quantidade</span><strong>{isEntry(movement.tipo) ? "+" : "−"}{movement.quantidade}</strong></div><div><span>Saldo</span><strong>{previous ?? "—"} → {next ?? "—"}</strong></div></article>;
      })}</div>}
    </Panel>
    <ConfirmDialog
      open={Boolean(confirmation)}
      title={confirmation?.operation === "AJUSTE" ? "Confirmar ajuste de estoque" : "Confirmar saída manual"}
      message={confirmation?.operation === "AJUSTE" ? `Confirmar ajuste de ${confirmation.previousBalance} para ${confirmation.value} unidade(s)?` : confirmation ? `Confirmar saída manual de ${confirmation.value} unidade(s) de ${confirmation.productName}?` : ""}
      confirmLabel={confirmation?.operation === "AJUSTE" ? "Confirmar ajuste" : "Confirmar saída"}
      variant="danger"
      processing={loading}
      onCancel={() => setConfirmation(null)}
      onConfirm={async () => { await processMovement(confirmation); setConfirmation(null); }}
    />
  </div>;
}
