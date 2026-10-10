import {
  CUSTOMER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PRICE_TYPE_LABELS
} from "../data/domain.js";
import { getSaleReceiptData } from "../services/sales.js";
import { formatCurrency } from "../utils/formatters.js";

function formatDateTime(value) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function SaleReceipt({ sale, customers = [] }) {
  const receipt = getSaleReceiptData(sale, customers);
  const isCancelled = receipt.status === "CANCELADA";

  return (
    <article className="sale-receipt sale-receipt-80mm">
      <header className="receipt-header">
        <h1>SARAIVA MOTOS</h1>
        <strong>COMPROVANTE</strong>
        {isCancelled && <div className="receipt-cancelled">*** VENDA CANCELADA ***</div>}
      </header>

      <section className="receipt-section receipt-sale-info">
        <p><span>Venda:</span> <strong>{receipt.numeroVenda}</strong></p>
        <p>{formatDateTime(receipt.dataHora)}</p>
      </section>

      <section className="receipt-section">
        <p><span>Cliente:</span> {receipt.clienteNome || "Consumidor não identificado"}</p>
        <p><span>Tipo:</span> {receipt.clienteTipo ? CUSTOMER_TYPE_LABELS[receipt.clienteTipo] || receipt.clienteTipo : receipt.tipoPrecoUtilizado}</p>
        <p><span>Tabela:</span> {PRICE_TYPE_LABELS[receipt.tipoPrecoUtilizado] || receipt.tipoPrecoUtilizado}</p>
      </section>

      <section className="receipt-items">
        {receipt.itens.map((item, index) => (
          <div className="receipt-item" key={item.id || `${item.codigoProduto}-${index}`}>
            <strong>{item.quantidade}x {item.descricaoProduto}</strong>
            {item.codigoProduto && <small>Ref.: {item.codigoProduto}</small>}
            <div><span>{item.quantidade} x {formatCurrency(item.precoUnitario)}</span><strong>{formatCurrency(item.subtotal)}</strong></div>
          </div>
        ))}
      </section>

      <section className="receipt-totals">
        <p><span>Subtotal</span><strong>{formatCurrency(receipt.subtotal)}</strong></p>
        {receipt.desconto > 0 && <p><span>Desconto ({Number(receipt.descontoPercentual).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%)</span><strong>{formatCurrency(receipt.desconto)}</strong></p>}
        <p className="receipt-total"><span>TOTAL</span><strong>{formatCurrency(receipt.total)}</strong></p>
        <p><span>Pagamento</span><strong>{PAYMENT_METHOD_LABELS[receipt.formaPagamento] || receipt.formaPagamento}</strong></p>
      </section>

      {receipt.observacoes && (
        <section className="receipt-section">
          <strong>Observação:</strong>
          <p>{receipt.observacoes}</p>
        </section>
      )}

      {isCancelled && (
        <section className="receipt-cancellation-details">
          <strong>Cancelada em: {formatDateTime(receipt.dataCancelamento)}</strong>
          <p>Motivo: {receipt.motivoCancelamento || "Não informado"}</p>
        </section>
      )}

      <footer className="receipt-footer">
        <p>Obrigado pela preferência!</p>
        <strong>SARAIVA MOTOS</strong>
        <small>*** COMPROVANTE ***</small>
      </footer>
    </article>
  );
}
