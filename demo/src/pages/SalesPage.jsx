import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import SalesHistory from "../components/SalesHistory.jsx";
import SaleReceiptPreview from "../components/SaleReceiptPreview.jsx";
import {
  CUSTOMER_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  getDefaultPriceType,
  getProductPrice
} from "../data/domain.js";
import {
  addProductToCart,
  calculateSaleTotals,
  changeCartItemPrice,
  changeCartItemQuantity,
  findProductByCode,
  repriceCart,
  searchActiveProducts
} from "../services/sales.js";
import { formatCurrency } from "../utils/formatters.js";

function SalesCheckout({ db, onFinalizeSale }) {
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const codeInputRef = useRef(null);

  const selectedCustomer = db.customers.find((customer) => customer.id === customerId) || null;
  const priceType = getDefaultPriceType(selectedCustomer);
  const totals = calculateSaleTotals(items, discount);
  const searchResults = useMemo(
    () => searchActiveProducts(db.products, search).slice(0, 8),
    [db.products, search]
  );

  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

  function focusCodeInput() {
    window.requestAnimationFrame(() => codeInputRef.current?.focus());
  }

  function showError(message) {
    setNotice({ type: "error", message });
  }

  function addProduct(product) {
    const result = addProductToCart(items, product, priceType);
    if (!result.ok) {
      showError(result.message);
      focusCodeInput();
      return;
    }
    setItems(result.items);
    setNotice({ type: "success", message: `${product.nome} adicionado ao carrinho.` });
    focusCodeInput();
  }

  function submitCode(event) {
    event.preventDefault();
    const result = findProductByCode(db.products, code);
    setCode("");
    if (!result.ok) {
      showError(result.message);
      focusCodeInput();
      return;
    }
    addProduct(result.product);
  }

  function changeCustomer(nextCustomerId) {
    const customer = db.customers.find((item) => item.id === nextCustomerId) || null;
    const nextPriceType = getDefaultPriceType(customer);
    setCustomerId(nextCustomerId);
    setItems((current) => repriceCart(current, db.products, nextPriceType));
    setNotice(null);
  }

  function updateQuantity(item, quantity) {
    const product = db.products.find((candidate) => candidate.id === item.produtoId);
    if (!product) return;
    const result = changeCartItemQuantity(items, product, quantity);
    if (!result.ok) {
      showError(result.message);
      return;
    }
    setItems(result.items);
    setNotice(null);
  }

  function updatePrice(item, price) {
    const result = changeCartItemPrice(items, item.produtoId, price);
    if (!result.ok) {
      showError(result.message);
      return;
    }
    setItems(result.items);
    setNotice(null);
  }

  function removeItem(productId) {
    setItems((current) => current.filter((item) => item.produtoId !== productId));
    setNotice(null);
  }

  function finalizeSale() {
    const result = onFinalizeSale({
      clienteId: customerId || null,
      tipoPrecoUtilizado: priceType,
      itens: items,
      desconto: Number(discount),
      formaPagamento: paymentMethod,
      observacoes: notes
    });

    if (!result.ok) {
      showError(result.message);
      return;
    }

    setLastSale(result.sale);
    setItems([]);
    setCustomerId("");
    setDiscount("0");
    setPaymentMethod("");
    setNotes("");
    setSearch("");
    setNotice({ type: "success", message: `Venda ${result.sale.numeroVenda} concluída com sucesso.` });
    focusCodeInput();
  }

  function startNewSale() {
    setLastSale(null);
    setNotice(null);
    focusCodeInput();
  }

  return (
    <div className="page-stack pdv-page">
      <Panel
        title="Atendimento"
        description="Leia ou digite o código do produto e pressione Enter."
        action={<span className={`price-type-badge price-${priceType.toLowerCase()}`}>{priceType}</span>}
      >
        <div className="pdv-entry-grid">
          <form className="scan-form" onSubmit={submitCode}>
            <label htmlFor="pdv-code">Código de barras ou referência</label>
            <div className="scan-input-row">
              <input
                id="pdv-code"
                ref={codeInputRef}
                className="scan-input"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Digite ou leia o código"
                autoComplete="off"
              />
              <button className="primary-button">Adicionar</button>
            </div>
          </form>

          <label className="pdv-customer-field">
            Cliente
            <select value={customerId} onChange={(event) => changeCustomer(event.target.value)}>
              <option value="">Consumidor não identificado</option>
              {db.customers.filter((customer) => customer.ativo).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.nomeRazaoSocial} · {CUSTOMER_TYPE_LABELS[customer.tipoCliente]}
                </option>
              ))}
            </select>
            <small>{selectedCustomer ? `Preço padrão: ${priceType}` : "Venda balcão · preço de varejo"}</small>
          </label>
        </div>

        <div className="manual-search-box">
          <label htmlFor="product-search">Busca manual</label>
          <input
            id="product-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, referência, código de barras, marca ou aplicação"
          />
          {search && (
            <div className="product-search-results">
              {searchResults.length === 0 ? (
                <p>Nenhum produto ativo encontrado.</p>
              ) : searchResults.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className="product-search-item"
                  onClick={() => addProduct(product)}
                  disabled={product.quantidadeEstoque <= 0}
                >
                  <span><strong>{product.nome}</strong><small>{product.codigoReferencia || "Sem referência"} · {product.marca || "Sem marca"}</small></span>
                  <span><strong>{formatCurrency(getProductPrice(product, priceType))}</strong><small>{product.quantidadeEstoque > 0 ? `${product.quantidadeEstoque} un. disponíveis` : "Sem estoque"}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {notice && <div className={`pdv-notice notice-${notice.type}`} role="status">{notice.message}</div>}

      <div className="pdv-layout">
        <Panel title={`Carrinho (${items.length})`} description="Ajuste quantidades e preços quando necessário.">
          {items.length === 0 ? (
            <EmptyState title="Carrinho vazio" description="Adicione um produto pelo código ou pela busca manual." />
          ) : (
            <div className="cart-list">
              {items.map((item) => {
                const product = db.products.find((candidate) => candidate.id === item.produtoId);
                return (
                  <article key={item.id} className="cart-item">
                    <div className="cart-product">
                      <strong>{item.descricaoProduto}</strong>
                      <span>{item.codigoProduto || "Sem referência"} · estoque: {product?.quantidadeEstoque ?? 0}</span>
                    </div>
                    <div className="cart-quantity">
                      <span>Quantidade</span>
                      <div>
                        <button type="button" onClick={() => updateQuantity(item, item.quantidade - 1)} disabled={item.quantidade <= 1}>−</button>
                        <input
                          key={`${item.id}-${item.quantidade}`}
                          type="number"
                          min="1"
                          max={product?.quantidadeEstoque}
                          defaultValue={item.quantidade}
                          onBlur={(event) => updateQuantity(item, event.target.value)}
                        />
                        <button type="button" onClick={() => updateQuantity(item, item.quantidade + 1)}>+</button>
                      </div>
                    </div>
                    <label className="cart-price">
                      Preço praticado
                      <input
                        key={`${item.id}-${item.precoUnitario}`}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={item.precoUnitario}
                        onBlur={(event) => updatePrice(item, event.target.value)}
                      />
                      <small>Original: {formatCurrency(item.precoOriginal)}{item.precoAlteradoManualmente ? " · negociado" : ""}</small>
                    </label>
                    <div className="cart-subtotal"><span>Subtotal</span><strong>{formatCurrency(item.subtotal)}</strong></div>
                    <button type="button" className="link-button" onClick={() => removeItem(item.produtoId)}>Remover</button>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Resumo da venda" description={selectedCustomer?.nomeRazaoSocial || "Venda balcão"}>
          <div className="sale-summary">
            <div className="summary-line"><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
            <label>
              Desconto
              <input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
            </label>
            <div className="summary-total"><span>Total</span><strong>{formatCurrency(totals.total)}</strong></div>
            <label>
              Forma de pagamento
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="">Selecione</option>
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
              </select>
            </label>
            <label>
              Observações
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </label>
            <button type="button" className="primary-button finalize-sale-button" onClick={finalizeSale}>Finalizar venda</button>
            {lastSale && (
              <div className="last-sale-success">
                <div><span>Venda concluída com sucesso</span><strong>{lastSale.numeroVenda}</strong></div>
                <div className="form-actions-pro">
                  <button type="button" className="secondary-button" onClick={() => setReceiptSale(lastSale)}>Imprimir comprovante</button>
                  <button type="button" className="primary-button" onClick={startNewSale}>Nova venda</button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {receiptSale && <SaleReceiptPreview sale={receiptSale} customers={db.customers} onClose={() => setReceiptSale(null)} />}
    </div>
  );
}

export default function SalesPage({ db, onFinalizeSale, onCancelSale }) {
  const [activeView, setActiveView] = useState("new");

  function showNewSale() {
    setActiveView("new");
    window.requestAnimationFrame(() => document.getElementById("pdv-code")?.focus());
  }

  return (
    <div className="page-stack">
      <div className="sales-view-tabs" role="tablist" aria-label="Área de vendas">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "new"}
          className={activeView === "new" ? "is-active" : ""}
          onClick={showNewSale}
        >
          Nova venda
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "history"}
          className={activeView === "history" ? "is-active" : ""}
          onClick={() => setActiveView("history")}
        >
          Histórico de vendas
        </button>
      </div>

      <div hidden={activeView !== "new"}>
        <SalesCheckout db={db} onFinalizeSale={onFinalizeSale} />
      </div>
      {activeView === "history" && <SalesHistory db={db} onCancelSale={onCancelSale} />}
    </div>
  );
}
