import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { formatCurrency } from "../utils/formatters.js";

const initialForm = {
  id: "",
  customerId: "",
  bikeId: "",
  service: "",
  partsUsed: "",
  mechanic: "",
  entryDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  status: "Aguardando",
  total: "0",
  sourceQuoteId: null
};

export default function OrdersPage({
  db,
  insights,
  draft,
  onConsumeDraft,
  onSave,
  onDelete,
  onStatusChange
}) {
  const [form, setForm] = useState(initialForm);

  const bikeOptions = useMemo(() => {
    return db.bikes.filter((bike) => bike.clienteId === form.customerId);
  }, [db.bikes, form.customerId]);

  useEffect(() => {
    if (draft) {
      setForm({
        ...initialForm,
        customerId: draft.customerId,
        bikeId: draft.bikeId,
        service: draft.service,
        partsUsed: draft.partsUsed || "",
        total: String(draft.total),
        sourceQuoteId: draft.sourceQuoteId,
        dueDate: draft.dueDate || ""
      });
      onConsumeDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [draft, onConsumeDraft]);

  useEffect(() => {
    if (form.bikeId && !bikeOptions.some((bike) => bike.id === form.bikeId)) {
      setForm((current) => ({ ...current, bikeId: "" }));
    }
  }, [bikeOptions, form.bikeId]);

  function resetForm() {
    setForm(initialForm);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...form,
      total: Number(form.total || 0)
    });
    resetForm();
  }

  function handleEdit(order) {
    setForm({
      id: order.id,
      customerId: order.customerId,
      bikeId: order.bikeId,
      service: order.service,
      partsUsed: order.partsUsed || "",
      mechanic: order.mechanic,
      entryDate: order.entryDate,
      dueDate: order.dueDate,
      status: order.status,
      total: String(order.total),
      sourceQuoteId: order.sourceQuoteId
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page-stack">
      <Panel
        title={form.id ? "Editar serviço" : "Novo serviço"}
        description="Registre o atendimento manualmente ou aproveite um orçamento aprovado."
      >
        <form className="form-grid-pro" onSubmit={handleSubmit}>
          <label>
            Cliente
            <select
              value={form.customerId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customerId: event.target.value,
                  bikeId: ""
                }))
              }
              required
            >
              <option value="">Selecione</option>
              {db.customers.filter((customer) => customer.ativo).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.nomeRazaoSocial}
                </option>
              ))}
            </select>
          </label>
          <label>
            Moto
            <select
              value={form.bikeId}
              onChange={(event) => setForm((current) => ({ ...current, bikeId: event.target.value }))}
              required
              disabled={!form.customerId}
            >
              <option value="">Selecione</option>
              {bikeOptions.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.marca} {bike.modelo}{bike.placa ? ` · ${bike.placa}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field-wide">
            Peças utilizadas
            <textarea
              value={form.partsUsed}
              onChange={(event) => setForm((current) => ({ ...current, partsUsed: event.target.value }))}
              rows={3}
              placeholder="Ex.: Óleo Motul 10W40, Filtro de Óleo"
            />
          </label>
          <label className="field-wide">
            Serviço
            <textarea
              value={form.service}
              onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
              rows={4}
              required
            />
          </label>
          <label>
            Mecânico responsável
            <input
              value={form.mechanic}
              onChange={(event) => setForm((current) => ({ ...current, mechanic: event.target.value }))}
              placeholder="Ex.: Marcos Silva"
              required
            />
          </label>
          <label>
            Data de entrada
            <input
              type="date"
              value={form.entryDate}
              onChange={(event) => setForm((current) => ({ ...current, entryDate: event.target.value }))}
              required
            />
          </label>
          <label>
            Previsão de entrega
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              required
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option>Aguardando</option>
              <option>Em andamento</option>
              <option>Finalizado</option>
            </select>
          </label>
          <label>
            Valor total
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.total}
              onChange={(event) => setForm((current) => ({ ...current, total: event.target.value }))}
              required
            />
          </label>

          <div className="form-actions-pro">
            {form.id && (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Cancelar edição
              </button>
            )}
            <button type="submit" className="primary-button">
              {form.id ? "Atualizar serviço" : "Criar serviço"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Serviços da oficina"
        description="Controle dos atendimentos aguardando, em andamento e finalizados."
      >
        {db.orders.length === 0 ? (
          <EmptyState
            title="Nenhuma OS cadastrada"
            description="Abra a primeira ordem de serviço para iniciar o atendimento da oficina."
          />
        ) : (
          <div className="card-grid">
            {db.orders.map((order) => (
              <article key={order.id} className="info-card">
                <div className="info-card-top">
                  <div>
                    <h4>{insights.getCustomerName(order.customerId)}</h4>
                    <p>{insights.getBikeName(order.bikeId)}</p>
                  </div>
                  <span className={`status-pill status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    {order.status}
                  </span>
                </div>

                <div className="quote-copy">
                  <strong>{order.service}</strong>
                  <p>Mecânico: {order.mechanic} · Peças: {order.partsUsed || "Nenhuma informada"}</p>
                </div>

                <div className="info-card-body">
                  <div>
                    <span>Entrada</span>
                    <strong>{order.entryDate}</strong>
                  </div>
                  <div>
                    <span>Entrega</span>
                    <strong>{order.dueDate}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{formatCurrency(order.total)}</strong>
                  </div>
                </div>

                <div className="inline-select">
                  <span>Atualizar status</span>
                  <select
                    value={order.status}
                    onChange={(event) => onStatusChange(order.id, event.target.value)}
                  >
                    <option>Aguardando</option>
                    <option>Em andamento</option>
                    <option>Finalizado</option>
                  </select>
                </div>

                <div className="card-actions">
                  <button type="button" className="secondary-button" onClick={() => handleEdit(order)}>
                    Editar
                  </button>
                  <button type="button" className="danger-button" onClick={() => onDelete(order.id)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
