import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BarcodeInput from "../components/BarcodeInput.jsx";
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
  buildSaleConfirmation,
  calculateSaleTotals,
  changeCartItemPrice,
  changeCartItemQuantity,
  findProductByCode,
  repriceCart,
  runSingleSubmission,
  searchActiveCustomers,
  searchActiveProducts
} from "../services/sales.js";
import { formatCurrency } from "../utils/formatters.js";
import { BACKEND_API_ENABLED, lookupProductByCode, listProducts } from "../services/productsApi.js";
import { listClients } from "../services/clientsApi.js";
import { cancelSaleApi, createSale, listSales } from "../services/salesApi.js";
import { interpretSalesLookupResponse } from "../services/productLookup.js";

function SalesCheckout({ db, onFinalizeSale, onLookupProductByCode }) {
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const codeInputRef = useRef(null);
  const finalizeLockRef = useRef(false);
  const navigate = useNavigate();

  const selectedCustomer = db.customers.find((customer) => String(customer.id) === String(customerId)) || null;
  const priceType = getDefaultPriceType(selectedCustomer);
  const totals = calculateSaleTotals(items, discount);
  const searchResults = useMemo(
    () => searchActiveProducts(db.products, search).slice(0, 8),
    [db.products, search]
  );
  const customerResults = useMemo(
    () => {
      const matches = searchActiveCustomers(db.customers, customerSearch).slice(0, 12);
      return selectedCustomer && !matches.some((customer) => customer.id === selectedCustomer.id)
        ? [selectedCustomer, ...matches]
        : matches;
    },
    [db.customers, customerSearch, selectedCustomer]
  );
  const confirmation = buildSaleConfirmation({
    customer: selectedCustomer,
    items,
    total: totals.total,
    paymentMethod
  });

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

  async function performCodeLookup(value) {
    const normalized = String(value || "").trim();
    if (!normalized || lookupLoading) return;
    setLookupLoading(true);
    let result;
    if (onLookupProductByCode) {
      try {
        const response = await onLookupProductByCode(normalized);
        result = interpretSalesLookupResponse(response, normalized);
      } catch (error) {
        result = { ok: false, message: error.message };
      }
    } else {
      result = findProductByCode(db.products, normalized);
    }
    setCode("");
    if (!result.ok) {
      setNotice({ type: "error", message: result.message, code: result.code });
      setLookupLoading(false);
      focusCodeInput();
      return;
    }
    addProduct(result.product);
    setLookupLoading(false);
  }

  function submitCode(event) {
    event.preventDefault();
    performCodeLookup(code);
  }

  function changeCustomer(nextCustomerId) {
    const customer = db.customers.find((item) => String(item.id) === String(nextCustomerId)) || null;
    const nextPriceType = getDefaultPriceType(customer);
    setCustomerId(nextCustomerId);
    setItems((current) => repriceCart(current, db.products, nextPriceType));
    setNotice(null);
  }

  function requestSaleConfirmation() {
    if (items.length === 0) return showError("Adicione pelo menos um produto ao carrinho.");
    if (!paymentMethod) return showError("Selecione uma forma de pagamento.");
    if (!Number.isFinite(Number(discount)) || Number(discount) < 0 || Number(discount) > totals.subtotal) {
      return showError("Revise o desconto informado.");
    }
    setNotice(null);
    setConfirmationOpen(true);
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

  async function finalizeSale() {
    if (finalizeLockRef.current) return;
    setIsFinalizing(true);
    let result;
    try {
      result = await runSingleSubmission(finalizeLockRef, () => onFinalizeSale({
        clienteId: customerId || null,
        tipoPrecoUtilizado: priceType,
        itens: items,
        desconto: Number(discount),
        formaPagamento: paymentMethod,
        observacoes: notes
      }));
    } catch (error) {
      result = { ok: false, message: error.message || "Não foi possível finalizar a venda." };
    } finally {
      setIsFinalizing(false);
    }
    if (result.skipped) return;

    if (!result.ok) {
      showError(result.message);
      return;
    }

    setLastSale(result.sale);
    setItems([]);
    setCustomerId("");
    setCustomerSearch("");
    setDiscount("0");
    setPaymentMethod("");
    setNotes("");
    setSearch("");
    setConfirmationOpen(false);
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
              <BarcodeInput
                id="pdv-code"
                ref={codeInputRef}
                className="scan-input"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onSubmit={performCodeLookup}
                disabled={lookupLoading}
                placeholder="Digite ou leia o código"
                autoComplete="off"
              />
              <button className="primary-button" disabled={lookupLoading}>{lookupLoading ? "Buscando..." : "Adicionar"}</button>
            </div>
          </form>

          <div className="pdv-customer-field">
            <label htmlFor="customer-search">Cliente</label>
            <input
              id="customer-search"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="Nome, CPF/CNPJ ou telefone"
            />
            <select aria-label="Selecionar cliente" value={customerId} onChange={(event) => changeCustomer(event.target.value)}>
              <option value="">Consumidor não identificado</option>
              {customerResults.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.nomeRazaoSocial} · {CUSTOMER_TYPE_LABELS[customer.tipoCliente]}
                </option>
              ))}
            </select>
            <div className="customer-selection-footer">
              <small>{selectedCustomer ? `Preço padrão: ${priceType}` : "Consumidor não identificado · preço de varejo"}</small>
              {selectedCustomer && <button type="button" className="link-button" onClick={() => changeCustomer("")}>Remover cliente</button>}
            </div>
          </div>
        </div>

        <div className="manual-search-box">
          <label htmlFor="product-search">Busca manual</label>
          <input
            id="product-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, referência, código de barras, marca, categoria ou aplicação"
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

      {notice && (
        <div className={`pdv-notice notice-${notice.type}`} role="status">
          <span>{notice.message}</span>
          {notice.code && <button type="button" className="secondary-button" onClick={() => navigate(`/pecas?codigo=${encodeURIComponent(notice.code)}`)}>Cadastrar produto</button>}
        </div>
      )}

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

        <Panel title="Resumo da venda" description={selectedCustomer?.nomeRazaoSocial || "Consumidor não identificado"}>
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
            <button type="button" className="primary-button finalize-sale-button" onClick={requestSaleConfirmation} disabled={isFinalizing}>{isFinalizing ? "Processando..." : "Finalizar venda"}</button>
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

      {confirmationOpen && (
        <div className="sale-confirmation-overlay" role="dialog" aria-modal="true" aria-labelledby="sale-confirmation-title">
          <div className="sale-confirmation-card">
            <h3 id="sale-confirmation-title">Confirmar venda</h3>
            <p>Confira os dados antes de registrar a venda.</p>
            <dl>
              <div><dt>Cliente</dt><dd>{confirmation.customerName}</dd></div>
              <div><dt>Itens</dt><dd>{confirmation.itemQuantity} unidade(s)</dd></div>
              <div><dt>Total</dt><dd>{formatCurrency(confirmation.total)}</dd></div>
              <div><dt>Pagamento</dt><dd>{PAYMENT_METHOD_LABELS[confirmation.paymentMethod]}</dd></div>
            </dl>
            <div className="form-actions-pro">
              <button type="button" className="secondary-button" onClick={() => setConfirmationOpen(false)} disabled={isFinalizing}>Voltar</button>
              <button type="button" className="primary-button" onClick={finalizeSale} disabled={isFinalizing}>{isFinalizing ? "Processando..." : "Confirmar e finalizar"}</button>
            </div>
          </div>
        </div>
      )}

      {receiptSale && <SaleReceiptPreview sale={receiptSale} customers={db.customers} onClose={() => setReceiptSale(null)} />}
    </div>
  );
}

function SalesWorkspace({ db, onFinalizeSale, onCancelSale, onLookupProductByCode }) {
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
        <SalesCheckout db={db} onFinalizeSale={onFinalizeSale} onLookupProductByCode={onLookupProductByCode} />
      </div>
      {activeView === "history" && <SalesHistory db={db} onCancelSale={onCancelSale} />}
    </div>
  );
}

function BackendSalesPage() {
  const [db, setDb] = useState({ products: [], customers: [], sales: [] });
  const [error, setError] = useState("");
  async function load() {
    try {
      const [products, customers, sales] = await Promise.all([listProducts(), listClients(), listSales()]);
      setDb({ products, customers, sales }); setError("");
    } catch (failure) { setError(failure.message); }
  }
  useEffect(() => { load(); }, []);
  async function finalize(draft) {
    try {
      const sale = await createSale({
        clienteId: draft.clienteId ? Number(draft.clienteId) : null,
        itens: draft.itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade, precoUnitario: item.precoUnitario })),
        desconto: draft.desconto, formaPagamento: draft.formaPagamento, observacoes: draft.observacoes
      });
      await load(); return { ok: true, sale };
    } catch (failure) { return { ok: false, message: failure.message }; }
  }
  async function cancel(id, reason) {
    try { const sale = await cancelSaleApi(id, reason); await load(); return { ok: true, sale }; }
    catch (failure) { return { ok: false, message: failure.message }; }
  }
  return <>{error && <div className="pdv-notice notice-error">{error}</div>}<SalesWorkspace db={db} onFinalizeSale={finalize} onCancelSale={cancel} onLookupProductByCode={lookupProductByCode}/></>;
}

export default function SalesPage(props) {
  return BACKEND_API_ENABLED ? <BackendSalesPage /> : <SalesWorkspace {...props} />;
}
