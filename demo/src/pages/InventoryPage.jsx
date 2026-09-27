import { useState } from "react";
import Panel from "../components/Panel.jsx";

const initialForm = { produtoId: "", tipo: "ENTRADA", quantidade: "1", motivo: "" };
const movementLabels = {
  ENTRADA: "Entrada",
  SAIDA_VENDA: "Saída por venda",
  AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SAIDA: "Ajuste de saída",
  CANCELAMENTO_VENDA: "Cancelamento de venda"
};

function isEntry(type) {
  return ["ENTRADA", "AJUSTE_ENTRADA", "CANCELAMENTO_VENDA"].includes(type);
}

export default function InventoryPage({ db, onMovement }) {
  const [form, setForm] = useState(initialForm);
  const activeProducts = db.products.filter((product) => product.ativo);
  const lowStock = activeProducts.filter((product) => product.quantidadeEstoque <= product.estoqueMinimo);
  const movements = [...db.stockMovements].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

  function submit(event) {
    event.preventDefault();
    onMovement({ ...form, quantidade: Number(form.quantidade) });
    setForm(initialForm);
  }

  return <div className="page-stack">
    <div className="dashboard-layout">
      <Panel title="Movimentar estoque" description="Registre entradas e ajustes manuais de estoque.">
        <form className="form-grid-pro" onSubmit={submit}>
          <label className="field-wide">Produto<select value={form.produtoId} onChange={(event) => setForm((current) => ({ ...current, produtoId: event.target.value }))} required><option value="">Selecione</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.nome} · atual: {product.quantidadeEstoque}</option>)}</select></label>
          <label>Tipo<select value={form.tipo} onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))}><option value="ENTRADA">Entrada</option><option value="AJUSTE_ENTRADA">Ajuste de entrada</option><option value="AJUSTE_SAIDA">Ajuste de saída</option></select></label>
          <label>Quantidade<input type="number" min="1" value={form.quantidade} onChange={(event) => setForm((current) => ({ ...current, quantidade: event.target.value }))} required /></label>
          <label className="field-wide">Motivo / referência<input value={form.motivo} onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))} placeholder="Ex.: Compra, correção de contagem..." required /></label>
          <div className="form-actions-pro field-wide"><button className="primary-button">Registrar movimentação</button></div>
        </form>
      </Panel>
      <Panel title={`Estoque baixo (${lowStock.length})`} description="Produtos ativos na quantidade mínima ou abaixo dela.">
        <div className="timeline-list">{lowStock.map((product) => <article key={product.id} className="timeline-item"><span className="status-pill status-recusado">Atenção</span><div><strong>{product.nome}</strong><p>{product.codigoReferencia || "Sem referência"} · mínimo {product.estoqueMinimo}</p></div><strong>{product.quantidadeEstoque} un.</strong></article>)}</div>
      </Panel>
    </div>
    <Panel title="Histórico de movimentações" description="Entradas e saídas registradas com os saldos de estoque.">
      <div className="table-like">{movements.map((movement) => {
        const product = db.products.find((item) => item.id === movement.produtoId);
        return <article key={movement.id} className="table-row stock-row"><span className={`movement-badge movement-${isEntry(movement.tipo) ? "in" : "out"}`}>{movementLabels[movement.tipo] || movement.tipo}</span><div><strong>{product?.nome || "Produto não encontrado"}</strong><p>{movement.motivo}</p></div><div><span>Data</span><strong>{movement.dataHora.slice(0, 10)}</strong></div><div><span>Saldo</span><strong>{movement.estoqueAnterior ?? "—"} → {movement.estoquePosterior ?? "—"}</strong></div></article>;
      })}</div>
    </Panel>
  </div>;
}
