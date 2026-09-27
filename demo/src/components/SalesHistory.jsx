import { useMemo, useState } from "react";
import EmptyState from "./EmptyState.jsx";
import Panel from "./Panel.jsx";
import SaleReceiptPreview from "./SaleReceiptPreview.jsx";
import {
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS
} from "../data/domain.js";
import {
  filterSalesHistory,
  getSaleCustomerLabel
} from "../services/sales.js";
import { formatCurrency } from "../utils/formatters.js";

function formatDateTime(value) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

const initialFilters = {
  search: "",
  customerId: "",
  status: "",
  dateFrom: "",
  dateTo: ""
};

export default function SalesHistory({ db, onCancelSale }) {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [showCancellation, setShowCancellation] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationError, setCancellationError] = useState("");
  const [receiptSaleId, setReceiptSaleId] = useState(null);
  const sales = useMemo(
    () => filterSalesHistory(db.sales, filters),
    [db.sales, filters]
  );
  const selectedSale = db.sales.find((sale) => sale.id === selectedSaleId) || null;
  const receiptSale = db.sales.find((sale) => sale.id === receiptSaleId) || null;

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function openSale(saleId) {
    setSelectedSaleId(saleId);
    setShowCancellation(false);
    setCancellationReason("");
    setCancellationError("");
  }

  function closeDetails() {
    setSelectedSaleId(null);
    setShowCancellation(false);
    setCancellationReason("");
    setCancellationError("");
  }

  function confirmCancellation() {
    const result = onCancelSale(selectedSale.id, cancellationReason);
    if (!result.ok) {
      setCancellationError(result.message);
      return;
    }
    setShowCancellation(false);
    setCancellationReason("");
    setCancellationError("");
  }

  return (
    <div className="page-stack sales-history">
      <Panel title="Histórico de vendas" description="Consulte vendas concluídas e canceladas.">
        <div className="sales-filters">
          <label>
            Número da venda
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="#000001" />
          </label>
          <label>
            Cliente
            <select value={filters.customerId} onChange={(event) => updateFilter("customerId", event.target.value)}>
              <option value="">Todos</option>
              {db.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.nomeRazaoSocial}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">Todos</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </label>
          <label>
            De
            <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          </label>
          <label>
            Até
            <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
          </label>
          <button type="button" className="secondary-button" onClick={() => setFilters(initialFilters)}>Limpar filtros</button>
        </div>
      </Panel>

      <Panel title={`${sales.length} venda(s) encontrada(s)`}>
        {sales.length === 0 ? (
          <EmptyState title="Nenhuma venda encontrada" description="Ajuste os filtros ou registre uma nova venda." />
        ) : (
          <div className="sales-history-list">
            {sales.map((sale) => {
              const itemCount = sale.itens.reduce((total, item) => total + item.quantidade, 0);
              return (
                <button type="button" key={sale.id} className="sale-history-row" onClick={() => openSale(sale.id)}>
                  <div><strong>{sale.numeroVenda}</strong><span>{formatDateTime(sale.dataHora)}</span></div>
                  <div><strong>{getSaleCustomerLabel(sale, db.customers)}</strong><span>{sale.tipoPrecoUtilizado}</span></div>
                  <div><span>Itens</span><strong>{itemCount}</strong></div>
                  <div><span>Pagamento</span><strong>{PAYMENT_METHOD_LABELS[sale.formaPagamento] || sale.formaPagamento}</strong></div>
                  <div><span>Total</span><strong>{formatCurrency(sale.total)}</strong></div>
                  <span className={`status-pill ${sale.status === "CONCLUIDA" ? "status-aprovado" : "status-cancelado"}`}>
                    {SALE_STATUS_LABELS[sale.status] || sale.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {selectedSale && (
        <Panel
          title={`Detalhes da venda ${selectedSale.numeroVenda}`}
          description={formatDateTime(selectedSale.dataHora)}
          action={<button type="button" className="secondary-button" onClick={closeDetails}>Fechar detalhes</button>}
        >
          <div className="sale-details-grid">
            <div><span>Status</span><strong>{SALE_STATUS_LABELS[selectedSale.status] || selectedSale.status}</strong></div>
            <div><span>Cliente</span><strong>{getSaleCustomerLabel(selectedSale, db.customers)}</strong></div>
            <div><span>Tipo de preço</span><strong>{selectedSale.tipoPrecoUtilizado}</strong></div>
            <div><span>Pagamento</span><strong>{PAYMENT_METHOD_LABELS[selectedSale.formaPagamento] || selectedSale.formaPagamento}</strong></div>
            <div className="field-wide"><span>Observações</span><strong>{selectedSale.observacoes || "Sem observações."}</strong></div>
          </div>

          <div className="sale-detail-items">
            {selectedSale.itens.map((item) => (
              <article key={item.id} className="sale-detail-item">
                <div><strong>{item.descricaoProduto}</strong><span>{item.codigoProduto || "Sem referência"}</span></div>
                <div><span>Quantidade</span><strong>{item.quantidade}</strong></div>
                <div><span>Preço original</span><strong>{formatCurrency(item.precoOriginal)}</strong></div>
                <div><span>Preço praticado</span><strong>{formatCurrency(item.precoUnitario)}</strong></div>
                <div><span>Subtotal</span><strong>{formatCurrency(item.subtotal)}</strong></div>
              </article>
            ))}
          </div>

          <div className="sale-detail-totals">
            <span>Subtotal <strong>{formatCurrency(selectedSale.subtotal)}</strong></span>
            <span>Desconto <strong>{formatCurrency(selectedSale.desconto)}</strong></span>
            <span>Total <strong>{formatCurrency(selectedSale.total)}</strong></span>
          </div>

          <div className="form-actions-pro sale-detail-actions">
            <button type="button" className="primary-button" onClick={() => setReceiptSaleId(selectedSale.id)}>Imprimir comprovante</button>
          </div>

          {selectedSale.status === "CANCELADA" ? (
            <div className="cancellation-record">
              <strong>Venda cancelada em {formatDateTime(selectedSale.dataCancelamento)}</strong>
              <p>Motivo: {selectedSale.motivoCancelamento}</p>
            </div>
          ) : showCancellation ? (
            <div className="cancellation-confirmation">
              <strong>Cancelar a venda {selectedSale.numeroVenda}?</strong>
              <p>Todos os itens desta venda voltarão ao estoque. Esta ação ficará registrada no histórico.</p>
              <label>
                Motivo do cancelamento
                <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={3} autoFocus />
              </label>
              {cancellationError && <div className="pdv-notice notice-error">{cancellationError}</div>}
              <div className="form-actions-pro">
                <button type="button" className="secondary-button" onClick={() => setShowCancellation(false)}>Voltar</button>
                <button type="button" className="danger-button" onClick={confirmCancellation} disabled={!cancellationReason.trim()}>Confirmar cancelamento e estorno</button>
              </div>
            </div>
          ) : (
            <div className="form-actions-pro sale-detail-actions">
              <button type="button" className="danger-button" onClick={() => setShowCancellation(true)}>Cancelar venda</button>
            </div>
          )}
        </Panel>
      )}

      {receiptSale && <SaleReceiptPreview sale={receiptSale} customers={db.customers} onClose={() => setReceiptSaleId(null)} />}
    </div>
  );
}
