import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "../data/domain.js";
import { formatPhone, normalizeText } from "../utils/formatters.js";

const initialForm = {
  id: "",
  nomeRazaoSocial: "",
  telefone: "",
  cpfCnpj: "",
  tipoCliente: "CLIENTE_COMUM",
  endereco: "",
  observacoes: ""
};

export default function CustomersPage({ db, onSave, onToggleActive }) {
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");

  const customers = useMemo(() => db.customers.filter((customer) => {
    const query = normalizeText(search.trim());
    const customerBikes = db.bikes.filter((bike) => bike.clienteId === customer.id);
    return !query || [
      customer.nomeRazaoSocial,
      customer.telefone,
      customer.cpfCnpj,
      CUSTOMER_TYPE_LABELS[customer.tipoCliente],
      ...customerBikes.flatMap((bike) => [bike.marca, bike.modelo, bike.placa])
    ].some((value) => normalizeText(String(value || "")).includes(query));
  }), [db.bikes, db.customers, search]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const saved = onSave({ ...form, nomeRazaoSocial: form.nomeRazaoSocial.trim() });
    if (saved !== false) {
      setForm(initialForm);
    }
  }

  function edit(customer) {
    setForm({
      id: customer.id,
      nomeRazaoSocial: customer.nomeRazaoSocial,
      telefone: customer.telefone,
      cpfCnpj: customer.cpfCnpj,
      tipoCliente: customer.tipoCliente,
      endereco: customer.endereco,
      observacoes: customer.observacoes
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page-stack">
      <Panel
        title={form.id ? "Editar cliente" : "Cadastrar cliente"}
        description="Cadastro de consumidores, oficinas, mecânicos e parceiros comerciais."
      >
        <form className="form-grid-pro" onSubmit={submit}>
          <label>
            Nome / razão social
            <input value={form.nomeRazaoSocial} onChange={(event) => update("nomeRazaoSocial", event.target.value)} required />
          </label>
          <label>
            Tipo de cliente
            <select value={form.tipoCliente} onChange={(event) => update("tipoCliente", event.target.value)}>
              {CUSTOMER_TYPES.map((type) => <option key={type} value={type}>{CUSTOMER_TYPE_LABELS[type]}</option>)}
            </select>
          </label>
          <label>
            Telefone
            <input value={form.telefone} onChange={(event) => update("telefone", formatPhone(event.target.value))} placeholder="(11) 99999-9999" />
          </label>
          <label>
            CPF / CNPJ
            <input value={form.cpfCnpj} onChange={(event) => update("cpfCnpj", event.target.value)} />
          </label>
          <label className="field-wide">
            Endereço
            <input value={form.endereco} onChange={(event) => update("endereco", event.target.value)} />
          </label>
          <label className="field-wide">
            Observações
            <textarea value={form.observacoes} onChange={(event) => update("observacoes", event.target.value)} rows={3} />
          </label>
          <div className="form-actions-pro field-wide">
            {form.id && <button type="button" className="secondary-button" onClick={() => setForm(initialForm)}>Cancelar edição</button>}
            <button className="primary-button">{form.id ? "Salvar alterações" : "Cadastrar cliente"}</button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Clientes cadastrados"
        description="Busque por nome, documento, telefone, tipo ou moto vinculada."
        action={<input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente" />}
      >
        {customers.length === 0 ? (
          <EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou faça o primeiro cadastro." />
        ) : (
          <div className="card-grid">
            {customers.map((customer) => {
              const customerBikes = db.bikes.filter((bike) => bike.clienteId === customer.id);
              return (
                <article key={customer.id} className="info-card">
                  <div className="info-card-top">
                    <div>
                      <h4>{customer.nomeRazaoSocial}</h4>
                      <p>{customer.telefone || "Telefone não informado"}</p>
                    </div>
                    <span className={`status-pill ${customer.ativo ? "status-aprovado" : "status-cancelado"}`}>
                      {customer.ativo ? CUSTOMER_TYPE_LABELS[customer.tipoCliente] : "Inativo"}
                    </span>
                  </div>
                  <div className="info-card-body">
                    <div><span>CPF / CNPJ</span><strong>{customer.cpfCnpj || "Não informado"}</strong></div>
                    <div><span>Motos vinculadas</span><strong>{customerBikes.length}</strong></div>
                    <div className="field-wide"><span>Endereço</span><strong>{customer.endereco || "Não informado"}</strong></div>
                    {customerBikes.length > 0 && (
                      <div className="field-wide">
                        <span>Motos</span>
                        <strong>{customerBikes.map((bike) => `${bike.marca} ${bike.modelo}${bike.placa ? ` · ${bike.placa}` : ""}`).join(" | ")}</strong>
                      </div>
                    )}
                  </div>
                  <div className="card-actions">
                    <button className="secondary-button" onClick={() => edit(customer)}>Editar</button>
                    <button className={customer.ativo ? "danger-button" : "secondary-button"} onClick={() => onToggleActive(customer)}>
                      {customer.ativo ? "Desativar" : "Reativar"}
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
