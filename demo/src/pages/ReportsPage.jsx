import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { IconCustomers, IconOrder, IconRevenue, IconSpark } from "../components/icons.jsx";
import { getCompletedSalesMetrics, getTopSellingProducts } from "../services/sales.js";
import { formatCurrency } from "../utils/formatters.js";

export default function ReportsPage({ db }) {
  const activeProducts = db.products.filter((product) => product.ativo);
  const lowStock = activeProducts.filter(
    (product) => product.quantidadeEstoque <= product.estoqueMinimo
  ).length;
  const stockUnits = activeProducts.reduce(
    (total, product) => total + Number(product.quantidadeEstoque || 0),
    0
  );
  const salesMetrics = getCompletedSalesMetrics(db.sales);
  const topProducts = getTopSellingProducts(db.sales).slice(0, 5);

  return (
    <div className="page-stack">
      <Panel
        title="Visão geral"
        description="Indicadores atuais dos cadastros e do estoque da Saraiva Motos."
      >
        <div className="stats-grid compact">
          <StatCard
            icon={<IconSpark />}
            label="Produtos cadastrados"
            value={activeProducts.length}
            hint={`${stockUnits} unidades em estoque`}
            tone="blue"
          />
          <StatCard
            icon={<IconRevenue />}
            label="Produtos com estoque baixo"
            value={lowStock}
            hint="Itens que precisam de reposição"
            tone="red"
          />
          <StatCard
            icon={<IconCustomers />}
            label="Clientes cadastrados"
            value={db.customers.filter((customer) => customer.ativo).length}
            hint="Cadastros disponíveis para atendimento"
            tone="orange"
          />
        </div>
      </Panel>

      <Panel
        title="Relatórios de vendas"
        description="Somente vendas concluídas entram nos indicadores."
      >
        {salesMetrics.completedSales === 0 ? (
          <EmptyState
            title="Nenhuma venda concluída"
            description="Os indicadores serão exibidos após a conclusão da primeira venda."
          />
        ) : (
          <div className="page-stack">
            <div className="stats-grid compact">
              <StatCard icon={<IconOrder />} label="Vendas concluídas" value={salesMetrics.completedSales} hint="Vendas canceladas não são contabilizadas" tone="green" />
              <StatCard icon={<IconRevenue />} label="Valor vendido" value={formatCurrency(salesMetrics.revenue)} hint="Faturamento válido registrado" tone="orange" />
              <StatCard icon={<IconSpark />} label="Itens vendidos" value={salesMetrics.itemsSold} hint="Quantidade total nas vendas válidas" tone="blue" />
            </div>
            <div>
              <h4>Produtos mais vendidos</h4>
              <div className="timeline-list">
                {topProducts.map((product) => (
                  <article key={product.produtoId} className="timeline-item">
                    <span className="plate-badge">{product.quantidade} un.</span>
                    <div><strong>{product.descricaoProduto}</strong><p>{product.codigoProduto || "Sem referência"}</p></div>
                    <strong>{formatCurrency(product.valorTotal)}</strong>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
