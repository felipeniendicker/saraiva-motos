import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from "../data/domain.js";
import { getSaleCustomerLabel } from "../services/sales.js";
import { formatCurrency } from "../utils/formatters.js";

export function formatSaleDateTime(value) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function SaleDetailsContent({ sale, customers = [] }) {
  return <>
    <div className="sale-details-grid">
      <div><span>Status</span><strong>{SALE_STATUS_LABELS[sale.status] || sale.status}</strong></div>
      <div><span>Cliente</span><strong>{getSaleCustomerLabel(sale, customers)}</strong></div>
      <div><span>Tipo de preço</span><strong>{sale.tipoPrecoUtilizado}</strong></div>
      <div><span>Pagamento</span><strong>{PAYMENT_METHOD_LABELS[sale.formaPagamento] || sale.formaPagamento}</strong></div>
      <div className="field-wide"><span>Observações</span><strong>{sale.observacoes || "Sem observações."}</strong></div>
    </div>

    <div className="sale-detail-items">
      {sale.itens.map((item) => <article key={item.id} className="sale-detail-item">
        <div><strong>{item.descricaoProduto}</strong><span>{item.codigoProduto || "Sem referência"}</span></div>
        <div><span>Quantidade</span><strong>{item.quantidade}</strong></div>
        <div><span>Preço original</span><strong>{formatCurrency(item.precoOriginal)}</strong></div>
        <div><span>Preço praticado</span><strong>{formatCurrency(item.precoUnitario)}</strong></div>
        <div><span>Subtotal</span><strong>{formatCurrency(item.subtotal)}</strong></div>
      </article>)}
    </div>

    <div className="sale-detail-totals">
      <span>Subtotal <strong>{formatCurrency(sale.subtotal)}</strong></span>
      <span>Desconto <strong>{formatCurrency(sale.desconto)}</strong></span>
      <span>Total <strong>{formatCurrency(sale.total)}</strong></span>
    </div>

    {sale.status === "CANCELADA" && <div className="cancellation-record">
      <strong>Venda cancelada em {formatSaleDateTime(sale.dataCancelamento)}</strong>
      <p>Motivo: {sale.motivoCancelamento || "Não informado"}</p>
    </div>}
  </>;
}
