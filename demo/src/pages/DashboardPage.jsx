import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { IconCustomers, IconOrder, IconRevenue, IconSpark } from "../components/icons.jsx";
import { getCompletedSalesMetrics } from "../services/sales.js";
import { formatCurrency } from "../utils/formatters.js";

export default function DashboardPage({ db }) {
  const activeProducts = db.products.filter((product) => product.ativo);
  const lowStock = activeProducts.filter((product) => product.quantidadeEstoque <= product.estoqueMinimo);
  const recentMovements = [...db.stockMovements].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)).slice(0, 6);
  const salesMetrics = getCompletedSalesMetrics(db.sales);

  return <div className="page-grid">
    <div className="stats-grid dashboard-stats">
      <StatCard icon={<IconSpark />} label="Produtos ativos" value={activeProducts.length} hint="Itens disponíveis no catálogo" tone="blue" />
      <StatCard icon={<IconRevenue />} label="Estoque baixo" value={lowStock.length} hint="Produtos que precisam de atenção" tone="red" />
      <StatCard icon={<IconCustomers />} label="Clientes ativos" value={db.customers.filter((customer) => customer.ativo).length} hint="Cadastros disponíveis para atendimento" tone="orange" />
      <StatCard icon={<IconOrder />} label="Vendas concluídas" value={salesMetrics.completedSales} hint={`${formatCurrency(salesMetrics.revenue)} em vendas válidas`} tone="green" />
    </div>

    <div className="dashboard-layout">
      <Panel title="Últimas movimentações de estoque" description="Entradas e saídas mais recentes da loja.">
        <div className="timeline-list">{recentMovements.map((movement) => {
          const product = db.products.find((item) => item.id === movement.produtoId);
          const entry = ["ENTRADA", "AJUSTE_ENTRADA", "CANCELAMENTO_VENDA"].includes(movement.tipo);
          return <article key={movement.id} className="timeline-item"><span className={`movement-badge movement-${entry ? "in" : "out"}`}>{entry ? "Entrada" : "Saída"}</span><div><strong>{product?.nome || "Produto não encontrado"}</strong><p>{movement.motivo} · {movement.dataHora.slice(0, 10)}</p></div><strong>{movement.quantidade} un.</strong></article>;
        })}</div>
      </Panel>

      <Panel title="Atenção ao estoque" description="Itens na quantidade mínima ou abaixo dela.">
        <div className="timeline-list">{lowStock.map((product) => <article key={product.id} className="timeline-item"><span className="status-pill status-recusado">Baixo</span><div><strong>{product.nome}</strong><p>{product.codigoReferencia || "Sem referência"} · mínimo recomendado: {product.estoqueMinimo}</p></div><strong>{product.quantidadeEstoque} un.</strong></article>)}</div>
        <div className="insight-banner"><strong>Controle de reposição</strong><p>Revise os itens sinalizados antes de realizar novos pedidos de compra.</p></div>
      </Panel>
    </div>
  </div>;
}
