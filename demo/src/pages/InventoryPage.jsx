import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { BACKEND_API_ENABLED, listProducts } from "../services/productsApi.js";
import { addStock, adjustStock, listStockMovements } from "../services/stockApi.js";

const initialForm = { produtoId: "", operacao: "ENTRADA", valor: "1", motivo: "" };
const movementLabels = {
  ENTRADA: "Entrada", SAIDA_VENDA: "Saída por venda", AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SAIDA: "Ajuste de saída", CANCELAMENTO_VENDA: "Cancelamento de venda"
};

function isEntry(type) {
  return ["ENTRADA", "AJUSTE_ENTRADA", "CANCELAMENTO_VENDA"].includes(type);
}

export default function InventoryPage({ db, onMovement }) {
  const [form, setForm] = useState(initialForm);
  const [apiProducts, setApiProducts] = useState([]);
  const [apiMovements, setApiMovements] = useState([]);
  const [loading, setLoading] = useState(BACKEND_API_ENABLED);
  const [message, setMessage] = useState("");
  const products = BACKEND_API_ENABLED ? apiProducts : db.products;
  const activeProducts = products.filter((product) => product.ativo);
  const lowStock = activeProducts.filter((product) => product.quantidadeEstoque <= product.estoqueMinimo);
  const movements = useMemo(() => {
    const source = BACKEND_API_ENABLED ? apiMovements : db.stockMovements;
    return [...source].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  }, [apiMovements, db.stockMovements]);

  async function loadApiData() {
    const [loadedProducts, loadedMovements] = await Promise.all([
      listProducts({ includeInactive: true }), listStockMovements()
    ]);
    setApiProducts(loadedProducts);
    setApiMovements(loadedMovements);
  }

  useEffect(() => {
    if (!BACKEND_API_ENABLED) return undefined;
    let active = true;
    setLoading(true);
    Promise.all([listProducts({ includeInactive: true }), listStockMovements()])
      .then(([loadedProducts, loadedMovements]) => {
        if (!active) return;
        setApiProducts(loadedProducts);
        setApiMovements(loadedMovements);
        setMessage("");
      })
      .catch((error) => active && setMessage(error.message || "Não foi possível carregar o estoque."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const value = Number(form.valor);
    const selected = products.find((product) => String(product.id) === String(form.produtoId));
    if (form.operacao === "AJUSTE" && selected && value === selected.quantidadeEstoque) {
      setMessage("O novo saldo deve ser diferente do estoque atual.");
      return;
    }

    if (BACKEND_API_ENABLED) {
      setLoading(true);
      try {
        if (form.operacao === "ENTRADA") {
          await addStock({ produtoId: Number(form.produtoId), quantidade: value, observacao: form.motivo });
        } else {
          await adjustStock({ produtoId: Number(form.produtoId), novoSaldo: value, motivo: form.motivo });
        }
        await loadApiData();
        setMessage("Movimentação registrada com sucesso.");
        setForm(initialForm);
      } catch (error) {
        setMessage(error.message || "Não foi possível registrar a movimentação.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (form.operacao === "ENTRADA") {
      onMovement({ produtoId: form.produtoId, tipo: "ENTRADA", quantidade: value, motivo: form.motivo });
    } else if (selected) {
      onMovement({ produtoId: form.produtoId, tipo: value > selected.quantidadeEstoque ? "AJUSTE_ENTRADA" : "AJUSTE_SAIDA", quantidade: Math.abs(value - selected.quantidadeEstoque), motivo: form.motivo });
    }
    setForm(initialForm);
  }

  return <div className="page-stack">
    <div className="dashboard-layout">
      <Panel title="Movimentar estoque" description="Registre entradas ou ajuste o saldo após uma contagem física.">
        {message && <div className="lookup-result lookup-warning"><div><p>{message}</p></div></div>}
        <form className="form-grid-pro" onSubmit={submit}>
          <label className="field-wide">Produto<select value={form.produtoId} onChange={(event) => setForm((current) => ({ ...current, produtoId: event.target.value }))} required><option value="">Selecione</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.nome} · atual: {product.quantidadeEstoque}</option>)}</select></label>
          <label>Operação<select value={form.operacao} onChange={(event) => setForm((current) => ({ ...current, operacao: event.target.value, valor: event.target.value === "ENTRADA" ? "1" : "0" }))}><option value="ENTRADA">Entrada</option><option value="AJUSTE">Ajustar saldo contado</option></select></label>
          <label>{form.operacao === "ENTRADA" ? "Quantidade" : "Novo saldo contado"}<input type="number" min={form.operacao === "ENTRADA" ? "1" : "0"} value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))} required /></label>
          <label className="field-wide">{form.operacao === "ENTRADA" ? "Observação / referência" : "Motivo do ajuste"}<input value={form.motivo} onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))} placeholder={form.operacao === "ENTRADA" ? "Ex.: Compra, nota fiscal..." : "Ex.: Correção após inventário..."} required={form.operacao === "AJUSTE"} /></label>
          <div className="form-actions-pro field-wide"><button className="primary-button" disabled={loading}>{loading ? "Processando..." : "Registrar movimentação"}</button></div>
        </form>
      </Panel>
      <Panel title={`Estoque baixo (${lowStock.length})`} description="Produtos ativos na quantidade mínima ou abaixo dela.">
        {lowStock.length === 0 ? <EmptyState title="Estoque em dia" description="Nenhum produto ativo está abaixo do mínimo." /> : <div className="timeline-list">{lowStock.map((product) => <article key={product.id} className="timeline-item"><span className="status-pill status-recusado">Atenção</span><div><strong>{product.nome}</strong><p>{product.codigoReferencia || "Sem referência"} · mínimo {product.estoqueMinimo}</p></div><strong>{product.quantidadeEstoque} un.</strong></article>)}</div>}
      </Panel>
    </div>
    <Panel title="Histórico de movimentações" description="Entradas e saídas registradas com os saldos de estoque.">
      {loading && movements.length === 0 ? <p>Carregando movimentações...</p> : movements.length === 0 ? <EmptyState title="Nenhuma movimentação" description="As movimentações registradas serão exibidas aqui." /> : <div className="table-like">{movements.map((movement) => {
        const product = products.find((item) => String(item.id) === String(movement.produtoId));
        const previous = movement.saldoAnterior ?? movement.estoqueAnterior;
        const next = movement.saldoPosterior ?? movement.estoquePosterior;
        return <article key={movement.id} className="table-row stock-row"><span className={`movement-badge movement-${isEntry(movement.tipo) ? "in" : "out"}`}>{movementLabels[movement.tipo] || movement.tipo}</span><div><strong>{movement.produtoNome || product?.nome || "Produto não encontrado"}</strong><p>{movement.motivo}</p></div><div><span>Data</span><strong>{movement.dataHora?.slice(0, 10)}</strong></div><div><span>Saldo</span><strong>{previous ?? "—"} → {next ?? "—"}</strong></div></article>;
      })}</div>}
    </Panel>
  </div>;
}
