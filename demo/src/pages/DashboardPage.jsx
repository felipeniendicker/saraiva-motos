import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { IconCustomers, IconOrder, IconRevenue, IconSpark } from "../components/icons.jsx";
import { getCompletedSalesMetrics } from "../services/sales.js";
import { BACKEND_API_ENABLED } from "../services/productsApi.js";
import { getDashboard } from "../services/dashboardApi.js";
import { formatCurrency } from "../utils/formatters.js";

function DashboardView({ data }) {
  const movements=data.movimentacoesRecentes||[], low=data.itensEstoqueBaixo||[];
  return <div className="page-grid"><div className="stats-grid dashboard-stats">
    <StatCard icon={<IconSpark/>} label="Produtos ativos" value={data.totalProdutosAtivos} hint="Itens disponíveis no catálogo" tone="blue"/>
    <StatCard icon={<IconRevenue/>} label="Estoque baixo" value={data.produtosEstoqueBaixo} hint="Produtos que precisam de atenção" tone="red"/>
    <StatCard icon={<IconCustomers/>} label="Clientes ativos" value={data.totalClientesAtivos} hint="Cadastros disponíveis para atendimento" tone="orange"/>
    <StatCard icon={<IconOrder/>} label="Vendas concluídas" value={data.vendasConcluidas} hint={`${formatCurrency(data.faturamento)} em vendas válidas`} tone="green"/>
  </div><div className="dashboard-layout">
    <Panel title="Últimas movimentações de estoque" description="As seis entradas e saídas mais recentes da loja.">{movements.length===0?<EmptyState title="Nenhuma movimentação" description="As movimentações aparecerão após a primeira operação de estoque."/>:<div className="timeline-list">{movements.map(m=>{const entry=["ENTRADA","AJUSTE_ENTRADA","CANCELAMENTO_VENDA"].includes(m.tipo);return <article key={m.id} className="timeline-item"><span className={`movement-badge movement-${entry?"in":"out"}`}>{entry?"Entrada":"Saída"}</span><div><strong>{m.produtoNome||"Produto não encontrado"}</strong><p>{m.motivo} · {m.dataHora?.slice(0,10)}</p></div><strong>{m.quantidade} un.</strong></article>;})}</div>}</Panel>
    <Panel title="Atenção ao estoque" description="Itens ativos na quantidade mínima ou abaixo dela.">{low.length===0?<EmptyState title="Estoque em dia" description="Nenhum produto ativo está abaixo do estoque mínimo."/>:<div className="timeline-list">{low.map(p=><article key={p.id} className="timeline-item"><span className="status-pill status-recusado">Baixo</span><div><strong>{p.nome}</strong><p>{p.codigoReferencia||"Sem referência"} · mínimo recomendado: {p.estoqueMinimo}</p></div><strong>{p.quantidadeEstoque} un.</strong></article>)}</div>}<div className="insight-banner"><strong>Controle de reposição</strong><p>Revise os itens sinalizados antes de realizar novos pedidos de compra.</p></div></Panel>
  </div></div>;
}
function Legacy({db}){const active=db.products.filter(p=>p.ativo),low=active.filter(p=>p.quantidadeEstoque<=p.estoqueMinimo),metrics=getCompletedSalesMetrics(db.sales),mov=[...db.stockMovements].sort((a,b)=>new Date(b.dataHora)-new Date(a.dataHora)).slice(0,6).map(m=>({...m,produtoNome:db.products.find(p=>p.id===m.produtoId)?.nome}));return <DashboardView data={{totalProdutosAtivos:active.length,produtosEstoqueBaixo:low.length,totalClientesAtivos:db.customers.filter(c=>c.ativo).length,vendasConcluidas:metrics.completedSales,faturamento:metrics.revenue,movimentacoesRecentes:mov,itensEstoqueBaixo:low}}/>;}
function Backend(){const[state,setState]=useState({loading:true});useEffect(()=>{getDashboard().then(data=>setState({data})).catch(error=>setState({error:error.message}));},[]);if(state.loading)return <Panel title="Carregando dashboard" description="Consultando os indicadores da Saraiva Motos."/>;if(state.error)return <Panel title="Dashboard indisponível" description={state.error}/>;return <DashboardView data={state.data}/>;}
export default function DashboardPage(props){return BACKEND_API_ENABLED?<Backend/>:<Legacy {...props}/>;}
