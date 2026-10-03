import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { IconOrder, IconRevenue, IconSpark } from "../components/icons.jsx";
import { getSalesReport, getStockReport } from "../services/reportsApi.js";
import { formatAppliedPeriod } from "../services/reportPeriod.js";
import { formatCurrency } from "../utils/formatters.js";

const initialFilters = { startDate: "", endDate: "" };

function ReportsView({ stock, sales, filters, appliedFilters, onChange, onSubmit }) {
  const summary = sales.resumo;
  const topProducts = sales.produtosMaisVendidos || [];
  const hasDraftFilter = Boolean(filters.startDate || filters.endDate);
  const filtersChanged = filters.startDate !== appliedFilters.startDate || filters.endDate !== appliedFilters.endDate;

  return <div className="page-stack reports-page">
    <Panel title="Visão geral do estoque" description="Indicadores atuais dos produtos ativos da Saraiva Motos.">
      <div className="stats-grid compact reports-stock-stats">
        <StatCard icon={<IconRevenue />} label="Valor do estoque" value={formatCurrency(stock.valorEstoqueCusto)} hint="Custo dos produtos ativos" tone="orange" />
        <StatCard icon={<IconSpark />} label="Produtos cadastrados" value={stock.produtosAtivos} hint={`${stock.unidadesEstoque} unidades em estoque`} tone="default" />
        <StatCard icon={<IconRevenue />} label="Estoque baixo" value={stock.produtosEstoqueBaixo} hint="Itens que precisam de reposição" tone={stock.produtosEstoqueBaixo > 0 ? "red" : "default"} />
      </div>
    </Panel>

    <Panel title="Relatório de vendas" description="Somente vendas concluídas entram nos indicadores.">
      <form className="reports-filter-form" onSubmit={onSubmit}>
        <label>Data inicial<input type="date" value={filters.startDate} onChange={(event) => onChange({ ...filters, startDate: event.target.value })} /></label>
        <label>Data final<input type="date" value={filters.endDate} onChange={(event) => onChange({ ...filters, endDate: event.target.value })} /></label>
        <button className="primary-button">Aplicar período</button>
      </form>
      <div className={`reports-applied-period${hasDraftFilter ? " has-filter" : ""}`}>
        <div><span>Período aplicado</span><strong>{formatAppliedPeriod(appliedFilters)}</strong></div>
        {filtersChanged && <small>Há alterações nos filtros. Aplique o período para atualizar os dados.</small>}
      </div>

      {summary.quantidadeVendas === 0 ? <EmptyState title="Nenhuma venda concluída" description="Não há vendas concluídas no período aplicado." /> : <div className="page-stack reports-results">
        <div className="stats-grid compact reports-sales-stats">
          <StatCard icon={<IconRevenue />} label="Valor vendido" value={formatCurrency(summary.faturamento)} hint={`Ticket médio: ${formatCurrency(summary.ticketMedio)}`} tone="orange" />
          <StatCard icon={<IconOrder />} label="Vendas concluídas" value={summary.quantidadeVendas} hint="Canceladas não são contabilizadas" tone="green" />
          <StatCard icon={<IconSpark />} label="Itens vendidos" value={summary.itensVendidos} hint={`Descontos: ${formatCurrency(summary.descontosConcedidos)}`} tone="default" />
        </div>
        <section className="reports-top-products" aria-labelledby="top-products-title">
          <div className="section-heading-inline"><div><h3 id="top-products-title">Produtos mais vendidos</h3><p>Comparativo por quantidade e valor vendido.</p></div></div>
          {topProducts.length === 0 ? <EmptyState title="Nenhum produto vendido" description="Não há itens vendidos no período aplicado." /> : <div className="timeline-list">{topProducts.slice(0, 5).map((product, index) => <article key={`${product.produtoId}-${product.descricao}-${product.codigoProduto}`} className="timeline-item report-product-row">
            <span className="report-product-position" aria-label={`${index + 1}º lugar`}>{index + 1}</span>
            <div><strong>{product.descricao}</strong><p>{product.codigoProduto || "Sem referência"}</p></div>
            <div><span>Quantidade</span><strong>{product.quantidadeVendida} un.</strong></div>
            <div><span>Valor vendido</span><strong>{formatCurrency(product.valorVendido)}</strong></div>
          </article>)}</div>}
        </section>
      </div>}
    </Panel>
  </div>;
}

export default function ReportsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [state, setState] = useState({ loading: true, stock: null, sales: null, error: "", retryFilters: initialFilters });

  async function load(requestedFilters = filters) {
    setState({ loading: true, stock: null, sales: null, error: "", retryFilters: requestedFilters });
    try {
      const [stock, sales] = await Promise.all([getStockReport(), getSalesReport(requestedFilters)]);
      setAppliedFilters({ ...requestedFilters });
      setState({ loading: false, stock, sales, error: "", retryFilters: requestedFilters });
    } catch (error) {
      setState({ loading: false, stock: null, sales: null, error: error.message, retryFilters: requestedFilters });
    }
  }

  useEffect(() => { load(initialFilters); }, []);

  if (state.loading) return <Panel title="Relatórios" description="Indicadores operacionais da Saraiva Motos."><LoadingState message="Consultando estoque e vendas..." /></Panel>;
  if (state.error) return <Panel title="Relatórios indisponíveis" description="Não foi possível consultar os dados atuais." action={<button type="button" className="primary-button" onClick={() => load(state.retryFilters)}>Tentar novamente</button>}><div className="feedback-message feedback-danger" role="alert">{state.error}</div></Panel>;
  return <ReportsView stock={state.stock} sales={state.sales} filters={filters} appliedFilters={appliedFilters} onChange={setFilters} onSubmit={(event) => { event.preventDefault(); load(filters); }} />;
}
