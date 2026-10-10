import { createPortal } from "react-dom";
import SaleReceipt from "./SaleReceipt.jsx";

export default function SaleReceiptPreview({ sale, customers, onClose }) {
  if (!sale) return null;

  return createPortal(
    <div className="receipt-preview-overlay" role="dialog" aria-modal="true" aria-label={`Comprovante da venda ${sale.numeroVenda}`}>
      <div className="receipt-preview-shell">
        <div className="receipt-preview-header no-print">
          <div>
            <strong>Comprovante {sale.numeroVenda}</strong>
            <span>Confira os dados antes de imprimir.</span>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Fechar</button>
        </div>

        <SaleReceipt sale={sale} customers={customers} />

        <div className="receipt-preview-actions no-print">
          <button type="button" className="secondary-button" onClick={onClose}>Voltar</button>
          <button type="button" className="primary-button" onClick={() => window.print()}>IMPRIMIR</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
