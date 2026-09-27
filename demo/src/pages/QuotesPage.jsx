import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { formatCurrency } from "../utils/formatters.js";

const initialForm = { id: "", customerId: "", bikeId: "", serviceDescription: "", items: [], laborValue: "0", status: "Pendente" };

export default function QuotesPage({ db, insights, onSave, onDelete, onStatusChange, onCreateOrderDraft }) {
  const [form, setForm] = useState(initialForm);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const bikeOptions = useMemo(() => db.bikes.filter((bike) => bike.clienteId === form.customerId), [db.bikes, form.customerId]);
  const partsValue = form.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const total = partsValue + Number(form.laborValue || 0);

  useEffect(() => {
    if (form.bikeId && !bikeOptions.some((bike) => bike.id === form.bikeId)) setForm((current) => ({ ...current, bikeId: "" }));
  }, [bikeOptions, form.bikeId]);

  function addItem() {
    const product = db.products.find((item) => item.id === productId);
    if (!product || Number(quantity) < 1) return;
    setForm((current) => {
      const existing = current.items.find((item) => item.productId === productId);
      return { ...current, items: existing
        ? current.items.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + Number(quantity) } : item)
        : [...current.items, { productId, quantity: Number(quantity), unitPrice: product.precoVarejo }] };
    });
    setProductId(""); setQuantity("1");
  }

  function submit(event) {
    event.preventDefault();
    const parts = form.items.map((item) => {
      const product = db.products.find((candidate) => candidate.id === item.productId);
      return `${item.quantity}x ${product?.nome || "Peça"}`;
    }).join(", ");
    onSave({ ...form, parts, partsValue, laborValue: Number(form.laborValue), total });
    setForm(initialForm);
  }

  function edit(quote) {
    setForm({ id: quote.id, customerId: quote.customerId, bikeId: quote.bikeId, serviceDescription: quote.serviceDescription, items: quote.items || [], laborValue: String(quote.laborValue || 0), status: quote.status });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="page-stack">
    <Panel title={form.id ? "Editar orçamento" : "Novo orçamento"} description="Selecione cliente, peças e serviços; os totais são calculados automaticamente.">
      <form className="form-grid-pro" onSubmit={submit}>
        <label>Cliente<select value={form.customerId} onChange={(e) => setForm((current) => ({ ...current, customerId: e.target.value, bikeId: "" }))} required><option value="">Selecione</option>{db.customers.filter((customer) => customer.ativo).map((customer) => <option key={customer.id} value={customer.id}>{customer.nomeRazaoSocial}</option>)}</select></label>
        <label>Moto<select value={form.bikeId} onChange={(e) => setForm((current) => ({ ...current, bikeId: e.target.value }))} required disabled={!form.customerId}><option value="">Selecione</option>{bikeOptions.map((bike) => <option key={bike.id} value={bike.id}>{bike.marca} {bike.modelo}{bike.placa ? ` · ${bike.placa}` : ""}</option>)}</select></label>
        <label className="field-wide">Serviços<textarea value={form.serviceDescription} onChange={(e) => setForm((current) => ({ ...current, serviceDescription: e.target.value }))} placeholder="Ex.: Troca de óleo, revisão, instalação de peça..." required /></label>

        <div className="field-wide item-builder">
          <label>Peça<select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Selecione uma peça</option>{db.products.filter((product) => product.ativo).map((product) => <option key={product.id} value={product.id}>{product.nome} · {formatCurrency(product.precoVarejo)}</option>)}</select></label>
          <label>Quantidade<input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
          <button type="button" className="secondary-button" onClick={addItem} disabled={!productId}>Adicionar peça</button>
        </div>

        {form.items.length > 0 && <div className="field-wide selected-items">{form.items.map((item) => {
          const product = db.products.find((candidate) => candidate.id === item.productId);
          return <div key={item.productId}><span><strong>{item.quantity}x</strong> {product?.nome || "Peça indisponível"}</span><span>{formatCurrency(item.quantity * item.unitPrice)} <button type="button" className="link-button" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((candidate) => candidate.productId !== item.productId) }))}>remover</button></span></div>;
        })}</div>}

        <label>Valor dos serviços<input type="number" min="0" step="0.01" value={form.laborValue} onChange={(e) => setForm((current) => ({ ...current, laborValue: e.target.value }))} required /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}><option>Pendente</option><option>Aprovado</option><option>Recusado</option><option>Finalizado</option></select></label>
        <div className="field-wide totals-box"><span>Subtotal das peças <strong>{formatCurrency(partsValue)}</strong></span><span>Serviços <strong>{formatCurrency(form.laborValue)}</strong></span><span>Total <strong>{formatCurrency(total)}</strong></span></div>
        <div className="form-actions-pro field-wide">{form.id && <button type="button" className="secondary-button" onClick={() => setForm(initialForm)}>Cancelar edição</button>}<button className="primary-button">{form.id ? "Atualizar orçamento" : "Salvar orçamento"}</button></div>
      </form>
    </Panel>

    <Panel title="Orçamentos cadastrados" description="Acompanhe a aprovação e gere um serviço quando o cliente autorizar.">
      {db.quotes.length === 0 ? <EmptyState title="Nenhum orçamento cadastrado" description="Crie o primeiro orçamento para iniciar o atendimento." /> : <div className="card-grid">{db.quotes.map((quote) => {
        const hasOrder = db.orders.some((order) => order.sourceQuoteId === quote.id);
        return <article key={quote.id} className="info-card"><div className="info-card-top"><div><h4>{insights.getCustomerName(quote.customerId)}</h4><p>{insights.getBikeName(quote.bikeId)}</p></div><span className={`status-pill status-${quote.status.toLowerCase().replace(/\s+/g, "-")}`}>{quote.status}</span></div><div className="quote-copy"><strong>{quote.serviceDescription}</strong><p>{quote.parts || "Sem peças selecionadas."}</p></div><div className="info-card-body"><div><span>Peças</span><strong>{formatCurrency(quote.partsValue)}</strong></div><div><span>Serviços</span><strong>{formatCurrency(quote.laborValue)}</strong></div><div><span>Total</span><strong>{formatCurrency(quote.total)}</strong></div></div><div className="inline-select"><span>Status</span><select value={quote.status} onChange={(e) => onStatusChange(quote.id, e.target.value)}><option>Pendente</option><option>Aprovado</option><option>Recusado</option><option>Finalizado</option></select></div><div className="card-actions"><button className="secondary-button" onClick={() => edit(quote)}>Editar</button><button className="danger-button" onClick={() => onDelete(quote.id)}>Excluir</button><button className="primary-button" disabled={quote.status !== "Aprovado" || hasOrder} onClick={() => onCreateOrderDraft(quote)}>{hasOrder ? "Serviço criado" : "Criar serviço"}</button></div></article>;
      })}</div>}
    </Panel>
  </div>;
}
