import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import StatCard from "../components/StatCard.jsx";
import { IconOrder, IconRevenue, IconSpark } from "../components/icons.jsx";
import {
  formatCurrency,
  formatMonthLabel,
  getCurrentMonthValue,
  isSameMonth
} from "../utils/formatters.js";

export default function BillingPage({ db, insights, month, onMonthChange }) {
  const finalizedOrders = db.orders.filter((order) => order.status === "Finalizado");
  const monthlyOrders = finalizedOrders.filter((order) => isSameMonth(order.completedAt, month));
  const totalRevenue = finalizedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const monthRevenue = monthlyOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageTicket = monthlyOrders.length ? monthRevenue / monthlyOrders.length : 0;

  return (
    <div className="page-stack">
      <Panel
        title="Faturamento"
        description="Apuração automática com base apenas nos serviços finalizados."
        action={
          <input
            type="month"
            className="search-input"
            value={month}
            onChange={(event) => onMonthChange(event.target.value || getCurrentMonthValue())}
          />
        }
      >
        <div className="stats-grid compact">
          <StatCard
            icon={<IconRevenue />}
            label="Total faturado"
            value={formatCurrency(totalRevenue)}
            hint="Acumulado histórico"
            tone="green"
          />
          <StatCard
            icon={<IconSpark />}
            label={`Faturamento de ${formatMonthLabel(month)}`}
            value={formatCurrency(monthRevenue)}
            hint="Baseado na data de finalização"
            tone="orange"
          />
          <StatCard
            icon={<IconOrder />}
            label="OS finalizadas no período"
            value={monthlyOrders.length}
            hint={`Ticket médio ${formatCurrency(averageTicket)}`}
            tone="blue"
          />
        </div>
      </Panel>

      <Panel
        title="Serviços finalizados"
        description="Lista usada para explicar faturamento, ticket médio e histórico da oficina."
      >
        {monthlyOrders.length === 0 ? (
          <EmptyState
            title="Nenhum serviço finalizado nesse mês"
            description="Selecione outro mês ou finalize uma OS para alimentar automaticamente o faturamento."
          />
        ) : (
          <div className="table-like">
            {monthlyOrders.map((order) => (
              <article key={order.id} className="table-row">
                <div>
                  <strong>{order.service}</strong>
                  <p>
                    {insights.getCustomerName(order.customerId)} ·{" "}
                    {insights.getBikeName(order.bikeId)}
                  </p>
                </div>
                <div>
                  <span>Finalizado em</span>
                  <strong>{order.completedAt}</strong>
                </div>
                <div>
                  <span>Valor</span>
                  <strong>{formatCurrency(order.total)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
