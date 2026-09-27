import { useMemo, useRef, useState } from "react";
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

export default function ProductsPage({ db, onSave, onToggleActive }) {
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [lookupResult, setLookupResult] = useState({ status: PRODUCT_LOOKUP_STATUS.IDLE });
  const barcodeInputRef = useRef(null);
  const products = useMemo(() => db.products.filter((product) => {
    const query = normalizeText(search.trim());
    return !query || [
      product.codigoReferencia,
      product.codigoBarras,
      product.nome,
      product.categoria,
      product.marca,
      product.aplicacao
    ].some((value) => normalizeText(String(value || "")).includes(query));
  }), [db.products, search]);

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
    scrollToForm();
  }

  async function submitBarcodeLookup(event) {
    event.preventDefault();
    const barcode = normalizeBarcode(barcodeQuery);
    if (!barcode) {
      setLookupResult({ status: PRODUCT_LOOKUP_STATUS.ERROR, message: "Informe um código para realizar a consulta.", barcode: "" });
      focusBarcodeInput();
      return;
    }

    setBarcodeQuery(barcode);
    setLookupResult({ status: PRODUCT_LOOKUP_STATUS.LOADING, barcode });
    const result = await lookupProductByBarcode(barcode, { products: db.products });
    setLookupResult(result);

    if ([PRODUCT_LOOKUP_STATUS.NOT_FOUND, PRODUCT_LOOKUP_STATUS.ERROR].includes(result.status)) {
      setForm({ ...initialForm, codigoBarras: result.barcode });
    }
    focusBarcodeInput();
  }

  function useExternalData() {
    setForm(applyLookupToProductForm(initialForm, lookupResult));
    scrollToForm();
  }

  function submit(event) {
    event.preventDefault();
    const saved = onSave({
      ...form,
      nome: form.nome.trim(),
      codigoReferencia: form.codigoReferencia.trim(),
      codigoBarras: normalizeBarcode(form.codigoBarras),
      valorCusto: Number(form.valorCusto),
      precoVarejo: Number(form.precoVarejo),
      precoRevenda: Number(form.precoRevenda),
      quantidadeEstoque: Number(form.quantidadeEstoque),
      estoqueMinimo: Number(form.estoqueMinimo)
    });

    if (saved !== false) {
      setForm(initialForm);
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
    scrollToForm();
  }

  return (
    <div className="page-stack">
      <Panel
        title="Consultar / cadastrar por código de barras"
        description="Passe o leitor ou digite o código e pressione Enter."
        action={<button type="button" className="secondary-button" onClick={() => prepareManualForm()}>+ Cadastrar manualmente</button>}
      >
        <form className="barcode-lookup-form" onSubmit={submitBarcodeLookup}>
          <input
            ref={barcodeInputRef}
            value={barcodeQuery}
            onChange={(event) => setBarcodeQuery(event.target.value)}
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
              <span className="status-pill status-aprovado">Produto já cadastrado</span>
              <h4>{lookupResult.product.nome}</h4>
              <p>{lookupResult.product.marca || "Sem marca"} · {lookupResult.product.codigoReferencia || "Sem referência"}</p>
            </div>
            <div className="lookup-product-data">
              <span>Estoque <strong>{lookupResult.product.quantidadeEstoque} un.</strong></span>
              <span>Varejo <strong>{formatCurrency(lookupResult.product.precoVarejo)}</strong></span>
              <span>Revenda <strong>{formatCurrency(lookupResult.product.precoRevenda)}</strong></span>
            </div>
            <button type="button" className="secondary-button" onClick={() => edit(lookupResult.product)}>Abrir produto</button>
          </div>
        )}

        {lookupResult.status === PRODUCT_LOOKUP_STATUS.FOUND_EXTERNAL && (
          <div className="lookup-result lookup-external">
            <div>
              <span className="status-pill status-aguardando">Informações encontradas</span>
              <h4>{lookupResult.nome || "Produto sem nome informado"}</h4>
              <p>{lookupResult.marca || "Marca não informada"} · {lookupResult.categoria || "Categoria não informada"}</p>
              {lookupResult.descricao && <p>{lookupResult.descricao}</p>}
            </div>
            <button type="button" className="primary-button" onClick={useExternalData}>Usar dados no cadastro</button>
          </div>
        )}

        {lookupResult.status === PRODUCT_LOOKUP_STATUS.NOT_FOUND && (
          <div className="lookup-result lookup-warning">
            <div><strong>Produto ainda não cadastrado.</strong><p>Não encontramos informações para este código. Você pode cadastrar a peça manualmente.</p></div>
            <button type="button" className="secondary-button" onClick={() => prepareManualForm(lookupResult.barcode)}>Continuar cadastro manual</button>
          </div>
        )}

        {lookupResult.status === PRODUCT_LOOKUP_STATUS.ERROR && lookupResult.message && (
          <div className="lookup-result lookup-warning">
            <div><strong>Consulta indisponível</strong><p>{lookupResult.message} O cadastro manual continua disponível.</p></div>
            {lookupResult.barcode && <button type="button" className="secondary-button" onClick={() => prepareManualForm(lookupResult.barcode)}>Continuar cadastro manual</button>}
          </div>
        )}
      </Panel>

      <div id="product-form">
        <Panel
        title={form.id ? "Editar produto" : "Cadastrar produto"}
        description="Dados comerciais, preços e controle de estoque da peça."
      >
        <form className="form-grid-pro" onSubmit={submit}>
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
          <label>
            Valor de custo
            <input type="number" min="0" step="0.01" value={form.valorCusto} onChange={(event) => update("valorCusto", event.target.value)} required />
          </label>
          <label>
            Preço de varejo
            <input type="number" min="0" step="0.01" value={form.precoVarejo} onChange={(event) => update("precoVarejo", event.target.value)} required />
          </label>
          <label>
            Preço de revenda
            <input type="number" min="0" step="0.01" value={form.precoRevenda} onChange={(event) => update("precoRevenda", event.target.value)} required />
          </label>
          <label>
            Estoque atual
            <input type="number" min="0" value={form.quantidadeEstoque} onChange={(event) => update("quantidadeEstoque", event.target.value)} required />
          </label>
          <label>
            Estoque mínimo
            <input type="number" min="0" value={form.estoqueMinimo} onChange={(event) => update("estoqueMinimo", event.target.value)} required />
          </label>
          <label className="field-wide">
            Observações
            <textarea value={form.observacoes} onChange={(event) => update("observacoes", event.target.value)} rows={3} />
          </label>
          <div className="form-actions-pro field-wide">
            {form.id && <button type="button" className="secondary-button" onClick={() => setForm(initialForm)}>Cancelar edição</button>}
            <button className="primary-button">{form.id ? "Salvar alterações" : "Cadastrar produto"}</button>
          </div>
        </form>
        </Panel>
      </div>

      <Panel
        title="Produtos cadastrados"
        description="Consulte referência, código de barras, estoque e preços."
        action={<input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto" />}
      >
        {products.length === 0 ? (
          <EmptyState title="Nenhum produto encontrado" description="Ajuste a busca ou cadastre o primeiro produto." />
        ) : (
          <div className="card-grid">
            {products.map((product) => {
              const lowStock = product.quantidadeEstoque <= product.estoqueMinimo;
              return (
                <article key={product.id} className={`info-card${lowStock && product.ativo ? " low-stock-card" : ""}`}>
                  <div className="info-card-top">
                    <div>
                      <h4>{product.nome}</h4>
                      <p>{product.codigoReferencia || "Sem referência"} · {product.marca || "Sem marca"}</p>
                    </div>
                    <span className={`status-pill ${product.ativo ? (lowStock ? "status-recusado" : "status-aprovado") : "status-cancelado"}`}>
                      {!product.ativo ? "Inativo" : lowStock ? "Estoque baixo" : "Ativo"}
                    </span>
                  </div>
                  <div className="info-card-body">
                    <div><span>Código de barras</span><strong>{product.codigoBarras || "Não informado"}</strong></div>
                    <div><span>Categoria</span><strong>{product.categoria || "Não informada"}</strong></div>
                    <div><span>Estoque</span><strong>{product.quantidadeEstoque} un. / mín. {product.estoqueMinimo}</strong></div>
                    <div><span>Aplicação</span><strong>{product.aplicacao || "Não informada"}</strong></div>
                    <div><span>Varejo</span><strong>{formatCurrency(product.precoVarejo)}</strong></div>
                    <div><span>Revenda</span><strong>{formatCurrency(product.precoRevenda)}</strong></div>
                  </div>
                  <div className="card-actions">
                    <button className="secondary-button" onClick={() => edit(product)}>Editar</button>
                    <button className={product.ativo ? "danger-button" : "secondary-button"} onClick={() => onToggleActive(product)}>
                      {product.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
