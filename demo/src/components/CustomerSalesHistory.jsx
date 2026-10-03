import { useState } from "react";
import EmptyState from "./EmptyState.jsx";
import SaleDetailsContent, { formatSaleDateTime } from "./SaleDetailsContent.jsx";
import SaleReceiptPreview from "./SaleReceiptPreview.jsx";
import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from "../data/domain.js";
import { formatCurrency } from "../utils/formatters.js";

export default function CustomerSalesHistory({ customer, sales }) {
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [receiptSaleId, setReceiptSaleId] = useState(null);
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId) || null;
  const receiptSale = sales.find((sale) => sale.id === receiptSaleId) || null;

  return <div className="customer-sales-history">
    <h3>Histórico de compras</h3>
    {sales.length === 0 ? <EmptyState title="Nenhuma compra identificada" description="As vendas vinculadas a este cliente aparecerão aqui." /> : <div className="sales-history-list">
      {sales.map((sale) => {
        const itemCount = sale.itens.reduce((total, item) => total + item.quantidade, 0);
        return <button type="button" key={sale.id} className="sale-history-row customer-purchase-card" onClick={() => setSelectedSaleId(sale.id)}>
          <div className="customer-purchase-identity"><span>Venda</span><strong>{sale.numeroVenda}</strong><small>{formatSaleDateTime(sale.dataHora)}</small></div>
          <div className="customer-purchase-secondary"><span>Itens</span><strong>{itemCount}</strong></div>
          <div className="customer-purchase-secondary"><span>Pagamento</span><strong>{PAYMENT_METHOD_LABELS[sale.formaPagamento] || sale.formaPagamento}</strong></div>
          <div className="customer-purchase-total"><span>Total</span><strong>{formatCurrency(sale.total)}</strong></div>
          <span className={`status-pill ${sale.status === "CONCLUIDA" ? "status-aprovado" : "status-cancelado"}`}>{SALE_STATUS_LABELS[sale.status] || sale.status}</span>
        </button>;
      })}
    </div>}

    {selectedSale && <div className="customer-sale-details">
      <div className="section-heading-inline"><div><h3>Venda {selectedSale.numeroVenda}</h3><p>{formatSaleDateTime(selectedSale.dataHora)}</p></div><button type="button" className="secondary-button" onClick={() => setSelectedSaleId(null)}>Fechar detalhes</button></div>
      <SaleDetailsContent sale={selectedSale} customers={[customer]} />
      <div className="form-actions-pro"><button type="button" className="primary-button" onClick={() => setReceiptSaleId(selectedSale.id)}>Imprimir comprovante</button></div>
    </div>}

    {receiptSale && <SaleReceiptPreview sale={receiptSale} customers={[customer]} onClose={() => setReceiptSaleId(null)} />}
  </div>;
}
