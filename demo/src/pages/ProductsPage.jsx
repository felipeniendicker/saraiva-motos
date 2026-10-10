import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BarcodeInput from "../components/BarcodeInput.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { formatCurrency, normalizeText } from "../utils/formatters.js";
import {
  PRODUCT_LOOKUP_STATUS,
  applyLookupToProductForm,
  isValidGtin,
  lookupProductByBarcode,
  normalizeBarcode
} from "../services/productLookup.js";
import {
  createProduct,
  deactivateProduct,
  lookupProductByCode,
  reactivateProduct,
  searchProducts,
  updateProduct
} from "../services/productsApi.js";

const initialForm = {
  id: "",
  nome: "",
  codigoReferencia: "",
  codigoBarras: "",
  marca: "",
  categoria: "",
  aplicacao: "",
  valorCusto: "0",
  precoVarejo: "0",
  precoRevenda: "0",
  quantidadeEstoque: "0",
  estoqueMinimo: "0",
  observacoes: ""
};

export default function ProductsPage() {
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [lookupResult, setLookupResult] = useState({ status: PRODUCT_LOOKUP_STATUS.IDLE });
  const [apiProducts, setApiProducts] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiSaving, setApiSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [formExpanded, setFormExpanded] = useState(false);
  const [formContext, setFormContext] = useState("manual");
  const barcodeInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const sourceProducts = apiProducts;
  const products = useMemo(() => sourceProducts.filter((product) => {
    const query = normalizeText(search.trim());
    return !query || [
      product.codigoReferencia,
      product.codigoBarras,
      product.nome,
      product.categoria,
      product.marca,
      product.aplicacao
    ].some((value) => normalizeText(String(value || "")).includes(query));
  }), [sourceProducts, search]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setApiLoading(true);
      try {
        const result = await searchProducts(search, { includeInactive: true });
        if (active) {
          setApiProducts(result);
          setFeedback(null);
        }
      } catch (error) {
        if (active) setFeedback({ type: "danger", message: error.message || "Não foi possível carregar os produtos." });
      } finally {
        if (active) setApiLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    const requestedCode = normalizeBarcode(searchParams.get("codigo"));
    if (requestedCode) {
      setBarcodeQuery(requestedCode);
      setForm({ ...initialForm, codigoBarras: requestedCode });
      setFormContext("manual");
      setFormExpanded(true);
      scrollToForm();
    }
  }, [searchParams]);

  async function reloadApiProducts() {
    const result = await searchProducts(search, { includeInactive: true });
    setApiProducts(result);
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function focusBarcodeInput() {
    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    });
  }

  function scrollToForm() {
    window.requestAnimationFrame(() => {
      document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function prepareManualForm(barcode = "") {
    setForm({ ...initialForm, codigoBarras: normalizeBarcode(barcode) });
    setFormContext("manual");
    setFormExpanded(true);
    scrollToForm();
  }

  async function performBarcodeLookup(value) {
    const barcode = normalizeBarcode(value);
    if (!barcode || lookupResult.status === PRODUCT_LOOKUP_STATUS.LOADING) return;

    setBarcodeQuery(barcode);
    setLookupResult({ status: PRODUCT_LOOKUP_STATUS.LOADING, barcode });
    const result = await lookupProductByBarcode(barcode, {
      products: sourceProducts,
      findLookup: lookupProductByCode
    });
    setLookupResult(result);

    if ([PRODUCT_LOOKUP_STATUS.NOT_FOUND, PRODUCT_LOOKUP_STATUS.ERROR].includes(result.status)) {
      setForm({ ...initialForm, codigoBarras: result.barcode });
    }
    focusBarcodeInput();
  }

  function submitBarcodeLookup(event) {
    event.preventDefault();
    performBarcodeLookup(barcodeQuery);
  }

  function useExternalData() {
    setForm(applyLookupToProductForm(initialForm, lookupResult));
    setFormContext("external");
    setFormExpanded(true);
    scrollToForm();
  }

  async function submit(event) {
    event.preventDefault();
    const productData = {
      ...form,
      nome: form.nome.trim(),
      codigoReferencia: form.codigoReferencia.trim(),
      codigoBarras: normalizeBarcode(form.codigoBarras),
      valorCusto: Number(form.valorCusto),
      precoVarejo: Number(form.precoVarejo),
      precoRevenda: Number(form.precoRevenda),
      quantidadeEstoque: Number(form.quantidadeEstoque),
      estoqueMinimo: Number(form.estoqueMinimo)
    };

    if (apiSaving) return;
    setApiSaving(true);
    try {
      if (form.id) {
        await updateProduct(form.id, productData);
      } else {
        await createProduct(productData);
      }
      await reloadApiProducts();
      setFeedback({ type: "success", message: "Produto salvo com sucesso." });
      setForm(initialForm);
      setFormExpanded(false);
    } catch (error) {
      setFeedback({ type: "danger", message: error.message || "Não foi possível salvar o produto." });
    } finally {
      setApiSaving(false);
    }
  }

  async function toggleActive(product) {
    setApiSaving(true);
    try {
      if (product.ativo) {
        await deactivateProduct(product.id);
      } else {
        await reactivateProduct(product.id);
      }
      await reloadApiProducts();
      setFeedback({ type: "success", message: product.ativo ? "Produto desativado." : "Produto reativado." });
    } catch (error) {
      setFeedback({ type: "danger", message: error.message || "Não foi possível alterar o produto." });
    } finally {
      setApiSaving(false);
    }
  }

  function edit(product) {
    setForm({
      id: product.id,
      nome: product.nome,
      codigoReferencia: product.codigoReferencia,
      codigoBarras: product.codigoBarras,
      marca: product.marca,
      categoria: product.categoria,
      aplicacao: product.aplicacao,
      valorCusto: String(product.valorCusto),
      precoVarejo: String(product.precoVarejo),
      precoRevenda: String(product.precoRevenda),
      quantidadeEstoque: String(product.quantidadeEstoque),
      estoqueMinimo: String(product.estoqueMinimo),
      observacoes: product.observacoes
    });
    setFormContext("edit");
    setFormExpanded(true);
    scrollToForm();
  }

  function closeForm() {
    setForm(initialForm);
    setFormContext("manual");
    setFormExpanded(false);
  }

  return (
    <div className="page-stack">
      <Panel
        title="Consultar / cadastrar por código de barras"
        description="Passe o leitor ou digite o código e pressione Enter."
        action={<button type="button" className="secondary-button" onClick={() => prepareManualForm()}>+ Cadastrar manualmente</button>}
      >
        <form className="barcode-lookup-form" onSubmit={submitBarcodeLookup}>
          <BarcodeInput
            ref={barcodeInputRef}
            value={barcodeQuery}
            onChange={(event) => setBarcodeQuery(event.target.value)}
            onSubmit={performBarcodeLookup}
            disabled={lookupResult.status === PRODUCT_LOOKUP_STATUS.LOADING}
            placeholder="Passe ou digite o código de barras"
            autoComplete="off"
            autoFocus
            aria-label="Código de barras para consulta"
          />
          <button className="primary-button" disabled={lookupResult.status === PRODUCT_LOOKUP_STATUS.LOADING}>
            {lookupResult.status === PRODUCT_LOOKUP_STATUS.LOADING ? "Consultando..." : "Consultar"}
          </button>
        </form>

        {lookupResult.barcode && (
          <p className="barcode-format-hint">
            Código {lookupResult.barcode} · {isValidGtin(lookupResult.barcode) ? "GTIN válido" : "Código permitido no sistema (não identificado como GTIN)"}
          </p>
        )}

        {lookupResult.status === PRODUCT_LOOKUP_STATUS.FOUND_LOCAL && (
          <div className="lookup-result lookup-local">
            <div>
              <span className={`status-pill ${lookupResult.product.ativo ? "status-aprovado" : "status-cancelado"}`}>
                {lookupResult.product.ativo ? "Produto já cadastrado" : "Produto inativo"}
              </span>
              <h4>{lookupResult.product.nome}</h4>
              <p>{lookupResult.product.marca || "Sem marca"} · {lookupResult.product.codigoReferencia || "Sem referência"}</p>
            </div>
            <div className="lookup-product-data">
              <span>Estoque <strong>{lookupResult.product.quantidadeEstoque} un.</strong></span>
              <span>Venda <strong>{formatCurrency(lookupResult.product.precoVarejo)}</strong></span>
              <span>Revenda <strong>{formatCurrency(lookupResult.product.precoRevenda)}</strong></span>
            </div>
            <button type="button" className="secondary-button" onClick={() => edit(lookupResult.product)}>Abrir produto</button>
          </div>
        )}

        {lookupResult.status === PRODUCT_LOOKUP_STATUS.FOUND_EXTERNAL && (
          <div className="lookup-result lookup-external">
            <div>
              <span className="status-pill status-aguardando">Produto encontrado na web</span>
              <div className="external-result-heading">
                <div><span>Origem da sugestão</span><strong>{lookupResult.source === "TAVILY" ? "Tavily" : lookupResult.source === "UPCITEMDB" ? "UPCitemdb" : lookupResult.source || "Fonte externa"}</strong></div>
                <p>Confira os dados antes de cadastrar.</p>
              </div>
              <div className="external-product-data">
                {lookupResult.nome && <div className="field-wide"><span>Nome</span><strong>{lookupResult.nome}</strong></div>}
                {lookupResult.marca && <div><span>Marca</span><strong>{lookupResult.marca}</strong></div>}
                {lookupResult.codigoReferencia && <div><span>Referência</span><strong>{lookupResult.codigoReferencia}</strong></div>}
                {lookupResult.categoria && <div><span>Categoria</span><strong>{lookupResult.categoria}</strong></div>}
                {lookupResult.aplicacao && <div><span>Aplicação</span><strong>{lookupResult.aplicacao}</strong></div>}
                {lookupResult.barcode && <div><span>Código de barras</span><strong>{lookupResult.barcode}</strong></div>}
                {lookupResult.descricao && <div className="field-wide"><span>Observações</span><strong>{lookupResult.descricao}</strong></div>}
              </div>
            </div>
            <button type="button" className="primary-button" onClick={useExternalData}>Usar dados no cadastro</button>
          </div>
        )}

        {lookupResult.status === PRODUCT_LOOKUP_STATUS.NOT_FOUND && (
          <div className="lookup-result lookup-warning">
            <div><strong>Produto não encontrado no cadastro.</strong><p>Nenhuma fonte configurada retornou informações para este código.</p></div>
            <button type="button" className="secondary-button" onClick={() => prepareManualForm(lookupResult.barcode)}>Cadastrar com este código</button>
          </div>
        )}

        {lookupResult.status === PRODUCT_LOOKUP_STATUS.ERROR && lookupResult.message && (
          <div className="lookup-result lookup-warning">
            <div><strong>Consulta indisponível</strong><p>{lookupResult.message} O cadastro manual continua disponível.</p></div>
            {lookupResult.barcode && <button type="button" className="secondary-button" onClick={() => prepareManualForm(lookupResult.barcode)}>Continuar cadastro manual</button>}
          </div>
        )}
      </Panel>

      {formExpanded && <div id="product-form">
        <Panel
        title={form.id ? "Editar produto" : "Cadastrar produto"}
        description={formContext === "external" ? "Sugestão externa aplicada. Revise todos os dados antes de salvar." : "Dados comerciais, preços e controle de estoque da peça."}
        action={<span className={`product-form-context context-${formContext}`}>{form.id ? "Edição" : formContext === "external" ? "Sugestão da web" : "Novo cadastro"}</span>}
      >
        <form className="product-form" onSubmit={submit}>
          <fieldset className="product-form-section product-identification-section">
          <legend>Identificação</legend>
          <label>
            Nome do produto
            <input value={form.nome} onChange={(event) => update("nome", event.target.value)} required />
          </label>
          <label>
            Código / referência
            <input value={form.codigoReferencia} onChange={(event) => update("codigoReferencia", event.target.value.toUpperCase())} />
          </label>
          <label>
            Código de barras
            <input value={form.codigoBarras} onChange={(event) => update("codigoBarras", event.target.value)} placeholder="Opcional" />
          </label>
          <label>
            Marca
            <input value={form.marca} onChange={(event) => update("marca", event.target.value)} />
          </label>
          <label>
            Categoria
            <input value={form.categoria} onChange={(event) => update("categoria", event.target.value)} placeholder="Freios, pneus, lubrificantes..." />
          </label>
          <label>
            Aplicação / modelo
            <input value={form.aplicacao} onChange={(event) => update("aplicacao", event.target.value)} placeholder="Ex.: Honda CG 160 2016+" />
          </label>
          </fieldset>
          <fieldset className="product-form-section product-prices-section">
          <legend>Preços</legend>
          <label>
            Valor de custo
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.valorCusto} onChange={(event) => update("valorCusto", event.target.value)} required />
          </label>
          <label>
            Preço de Venda
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.precoVarejo} onChange={(event) => update("precoVarejo", event.target.value)} required />
          </label>
          <label>
            Preço de Revenda
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.precoRevenda} onChange={(event) => update("precoRevenda", event.target.value)} required />
          </label>
          </fieldset>
          <fieldset className="product-form-section product-stock-section">
          <legend>Estoque</legend>
          <label>
            Estoque atual (altere na tela Estoque)
            <input type="number" min="0" value={form.quantidadeEstoque} onChange={(event) => update("quantidadeEstoque", event.target.value)} required disabled />
          </label>
          <label>
            Estoque mínimo
            <input type="number" min="0" value={form.estoqueMinimo} onChange={(event) => update("estoqueMinimo", event.target.value)} required />
          </label>
          </fieldset>
          <fieldset className="product-form-section product-complement-section">
          <legend>Complemento</legend>
          <label>
            Observações
            <textarea value={form.observacoes} onChange={(event) => update("observacoes", event.target.value)} rows={3} />
          </label>
          </fieldset>
          <div className="form-actions-pro product-form-actions">
            <button type="button" className="secondary-button" disabled={apiSaving} onClick={closeForm}>Cancelar</button>
            <button className="primary-button" disabled={apiSaving}>{apiSaving ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar produto"}</button>
          </div>
        </form>
        </Panel>
      </div>}

      <Panel
        title="Produtos cadastrados"
        description="Consulte referência, código de barras, estoque e preços."
        action={<label className="catalog-search">Buscar no catálogo<input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, código, marca..." /></label>}
      >
        {feedback && (
          <div className={`feedback-message feedback-${feedback.type}`} role={feedback.type === "danger" ? "alert" : "status"}>{feedback.message}</div>
        )}
        {apiLoading ? <div className="section-loading" role="status"><span className="loading-indicator" aria-hidden="true" />Carregando produtos...</div> : feedback?.type === "danger" && products.length === 0 ? null : products.length === 0 ? (
          <EmptyState title="Nenhum produto encontrado" description="Ajuste a busca ou cadastre o primeiro produto." />
        ) : (
          <div className="products-catalog-grid">
            {products.map((product) => {
              const lowStock = product.quantidadeEstoque <= product.estoqueMinimo;
              const noStock = product.quantidadeEstoque === 0;
              return (
                <article key={product.id} className={`info-card product-catalog-card${lowStock && product.ativo ? " low-stock-card" : ""}`}>
                  <div className="info-card-top">
                    <div>
                      <h4>{product.nome}</h4>
                      <p>{product.codigoReferencia || "Sem referência"}</p>
                    </div>
                    <div className="product-statuses">
                      <span className={`status-pill ${product.ativo ? "status-aprovado" : "status-cancelado"}`}>{product.ativo ? "Ativo" : "Inativo"}</span>
                      <span className={`status-pill ${noStock ? "status-cancelado" : lowStock ? "status-pendente" : "status-aprovado"}`}>{noStock ? "Sem estoque" : lowStock ? "Estoque baixo" : "Estoque normal"}</span>
                    </div>
                  </div>
                  <div className="product-catalog-main">
                    <div className="catalog-brand"><span>Marca</span><strong>{product.marca || "Não informada"}</strong></div>
                    <div><span>Estoque</span><strong>{product.quantidadeEstoque} un. / mín. {product.estoqueMinimo}</strong></div>
                    <div><span>Venda</span><strong>{formatCurrency(product.precoVarejo)}</strong></div>
                    <div className="catalog-resale"><span>Revenda</span><strong>{formatCurrency(product.precoRevenda)}</strong></div>
                  </div>
                  <details className="product-secondary-details">
                    <summary>Ver detalhes</summary>
                    <div className="product-secondary-grid">
                      <div><span>Código de barras</span><strong>{product.codigoBarras || "Não informado"}</strong></div>
                      <div><span>Categoria</span><strong>{product.categoria || "Não informada"}</strong></div>
                      <div><span>Aplicação</span><strong>{product.aplicacao || "Não informada"}</strong></div>
                      <div><span>Custo</span><strong>{formatCurrency(product.valorCusto)}</strong></div>
                      <div className="mobile-only-detail"><span>Revenda</span><strong>{formatCurrency(product.precoRevenda)}</strong></div>
                      <div><span>Cadastro</span><strong>{product.dataCadastro ? new Date(product.dataCadastro).toLocaleDateString("pt-BR") : "Não informado"}</strong></div>
                    </div>
                  </details>
                  <div className="card-actions">
                    <button className="secondary-button" disabled={apiSaving} onClick={() => edit(product)}>Editar</button>
                    <button disabled={apiSaving} className={product.ativo ? "danger-button" : "secondary-button"} onClick={() => setConfirmation(product)}>
                      {product.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.ativo ? "Desativar produto" : "Reativar produto"}
        message={confirmation ? `Deseja ${confirmation.ativo ? "desativar" : "reativar"} o produto ${confirmation.nome}?` : ""}
        confirmLabel={confirmation?.ativo ? "Desativar produto" : "Reativar produto"}
        variant={confirmation?.ativo ? "danger" : "default"}
        processing={apiSaving}
        onCancel={() => setConfirmation(null)}
        onConfirm={async () => { await toggleActive(confirmation); setConfirmation(null); }}
      />
    </div>
  );
}
