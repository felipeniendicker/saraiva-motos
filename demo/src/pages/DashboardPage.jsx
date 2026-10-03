import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { IconCustomers, IconOrder, IconRevenue, IconSpark } from "../components/icons.jsx";
import { getDashboard } from "../services/dashboardApi.js";
import { formatCurrency, formatDateTime } from "../utils/formatters.js";

const MOVEMENT_LABELS = {
  ENTRADA: "Entrada",
  SAIDA_VENDA: "Saída por venda",
  AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SAIDA: "Ajuste de saída",
  SAIDA_MANUAL: "Saída manual",
  CANCELAMENTO_VENDA: "Cancelamento de venda"
};

function isEntry(type) {
  return ["ENTRADA", "AJUSTE_ENTRADA", "CANCELAMENTO_VENDA"].includes(type);
}

function DashboardView({ data }) {
  const movements = data.movimentacoesRecentes || [];
  const lowStock = data.itensEstoqueBaixo || [];

  return <div className="page-grid dashboard-page">
    <div className="stats-grid dashboard-stats">
      <StatCard icon={<IconOrder />} label="Vendas concluídas" value={data.vendasConcluidas} hint={`${formatCurrency(data.faturamento)} em vendas válidas`} tone="orange" />
      <StatCard icon={<IconRevenue />} label="Estoque baixo" value={data.produtosEstoqueBaixo} hint="Produtos que precisam de atenção" tone={data.produtosEstoqueBaixo > 0 ? "red" : "default"} />
      <StatCard icon={<IconSpark />} label="Produtos ativos" value={data.totalProdutosAtivos} hint="Itens disponíveis no catálogo" tone="default" />
      <StatCard icon={<IconCustomers />} label="Clientes ativos" value={data.totalClientesAtivos} hint="Cadastros disponíveis para atendimento" tone="default" />
    </div>

    <div className="dashboard-layout dashboard-operational-grid">
      <Panel title="Últimas movimentações" description="Entradas e saídas recentes do estoque.">
        {movements.length === 0 ? <EmptyState title="Nenhuma movimentação" description="As movimentações aparecerão após a primeira operação de estoque." /> : <div className="timeline-list dashboard-movements">{movements.map((movement) => {
          const entry = isEntry(movement.tipo);
          return <article key={movement.id} className="timeline-item dashboard-movement-row">
            <span className={`movement-badge movement-${entry ? "in" : "out"}`}>{MOVEMENT_LABELS[movement.tipo] || (entry ? "Entrada" : "Saída")}</span>
            <div className="dashboard-movement-product"><strong>{movement.produtoNome || "Produto não encontrado"}</strong><p>{movement.motivo || "Sem observação"}</p></div>
            <div className="dashboard-movement-meta"><span>Quantidade</span><strong>{entry ? "+" : "−"}{movement.quantidade} un.</strong></div>
            <div className="dashboard-movement-date"><span>Data/hora</span><strong>{formatDateTime(movement.dataHora)}</strong></div>
          </article>;
        })}</div>}
      </Panel>

      <Panel title="Atenção ao estoque" description="Produtos ativos na quantidade mínima ou abaixo dela.">
        {lowStock.length === 0 ? <div className="dashboard-stock-ok" role="status"><span className="status-pill status-aprovado">Estoque em dia</span><p>Nenhum produto ativo está abaixo do estoque mínimo.</p></div> : <>
          <div className="timeline-list dashboard-stock-alerts">{lowStock.map((product) => {
            const empty = Number(product.quantidadeEstoque) <= 0;
            return <article key={product.id} className={`timeline-item dashboard-stock-alert alert-${empty ? "empty" : "low"}`}>
              <span className={`status-pill ${empty ? "status-cancelado" : "status-pendente"}`}>{empty ? "Sem estoque" : "Estoque baixo"}</span>
              <div><strong>{product.nome}</strong><p>{product.codigoReferencia || "Sem referência"} · mínimo {product.estoqueMinimo}</p></div>
              <strong>{product.quantidadeEstoque} un.</strong>
            </article>;
          })}</div>
          <div className="dashboard-replenishment-note"><strong>Controle de reposição</strong><span>Revise primeiro os itens sem estoque e abaixo do mínimo.</span></div>
        </>}
      </Panel>
    </div>
  </div>;
}

export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  async function load() {
    setState({ loading: true, data: null, error: "" });
    try { setState({ loading: false, data: await getDashboard(), error: "" }); }
    catch (error) { setState({ loading: false, data: null, error: error.message }); }
  }

  useEffect(() => { load(); }, []);

  if (state.loading) return <Panel title="Dashboard" description="Visão rápida da operação da Saraiva Motos."><LoadingState message="Consultando indicadores e movimentações..." /></Panel>;
  if (state.error) return <Panel title="Dashboard indisponível" description="Não foi possível consultar os dados atuais." action={<button type="button" className="primary-button" onClick={load}>Tentar novamente</button>}><div className="feedback-message feedback-danger" role="alert">{state.error}</div></Panel>;
  return <DashboardView data={state.data} />;
}
