import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "../data/domain.js";
import { formatPhone, normalizeText } from "../utils/formatters.js";
import { BACKEND_API_ENABLED } from "../services/productsApi.js";
import * as clientsApi from "../services/clientsApi.js";

const initialForm = {
  id: "",
  nomeRazaoSocial: "",
  telefone: "",
  cpfCnpj: "",
  tipoCliente: "CLIENTE_COMUM",
  endereco: "",
  observacoes: ""
};

function LegacyCustomersPage({ db, onSave, onToggleActive }) {
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

const initialMoto = { marca: "", modelo: "", ano: "", cilindrada: "", placa: "", observacoes: "" };

function BackendCustomersPage() {
  const [form, setForm] = useState(initialForm);
  const [customers, setCustomers] = useState([]);
  const [motos, setMotos] = useState({});
  const [motoForm, setMotoForm] = useState(initialMoto);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try { setCustomers(await clientsApi.listClients({ search, includeInactive })); }
    catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  useEffect(() => { load(); }, [search, includeInactive]);

  async function save(event) {
    event.preventDefault();
    try {
      if (form.id) await clientsApi.updateClient(form.id, form); else await clientsApi.createClient(form);
      setForm(initialForm); setNotice({ type: "success", message: "Cliente salvo com sucesso." }); await load();
    } catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  async function toggle(customer) {
    if (!window.confirm(`Deseja ${customer.ativo ? "desativar" : "reativar"} ${customer.nomeRazaoSocial}?`)) return;
    try { await (customer.ativo ? clientsApi.deactivateClient(customer.id) : clientsApi.reactivateClient(customer.id)); await load(); }
    catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  async function openMotos(customer) {
    try { const result = await clientsApi.listClientMotorcycles(customer.id); setSelected(customer); setMotos((current) => ({ ...current, [customer.id]: result })); }
    catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  async function saveMoto(event) {
    event.preventDefault();
    const payload = { ...motoForm, ano: motoForm.ano ? Number(motoForm.ano) : null };
    try {
      if (motoForm.id) await clientsApi.updateMotorcycle(motoForm.id, payload); else await clientsApi.createMotorcycle(selected.id, payload);
      setMotoForm(initialMoto); await openMotos(selected);
    } catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  async function removeMoto(moto) {
    if (!window.confirm(`Remover ${moto.marca} ${moto.modelo}?`)) return;
    try { await clientsApi.deleteMotorcycle(moto.id); await openMotos(selected); }
    catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  const edit = (c) => setForm({ ...initialForm, ...c });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return <div className="page-stack">
    {notice && <div className={`pdv-notice notice-${notice.type}`} role="status">{notice.message}</div>}
    <Panel title={form.id ? "Editar cliente" : "Cadastrar cliente"} description="Cadastro de consumidores e parceiros comerciais.">
      <form className="form-grid-pro" onSubmit={save}>
        <label>Nome / razão social<input value={form.nomeRazaoSocial} onChange={(e)=>update("nomeRazaoSocial",e.target.value)} required /></label>
        <label>Tipo de cliente<select value={form.tipoCliente} onChange={(e)=>update("tipoCliente",e.target.value)}>{CUSTOMER_TYPES.map(t=><option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>)}</select></label>
        <label>Telefone<input value={form.telefone} onChange={(e)=>update("telefone",formatPhone(e.target.value))} /></label>
        <label>CPF / CNPJ<input value={form.cpfCnpj} onChange={(e)=>update("cpfCnpj",e.target.value)} /></label>
        <label className="field-wide">Endereço<input value={form.endereco} onChange={(e)=>update("endereco",e.target.value)} /></label>
        <label className="field-wide">Observações<textarea value={form.observacoes} onChange={(e)=>update("observacoes",e.target.value)} rows={3}/></label>
        <div className="form-actions-pro field-wide">{form.id&&<button type="button" className="secondary-button" onClick={()=>setForm(initialForm)}>Cancelar</button>}<button className="primary-button">Salvar cliente</button></div>
      </form>
    </Panel>
    <Panel title="Clientes cadastrados" description="Consulte clientes ativos e inativos."
      action={<div className="form-actions-pro"><input className="search-input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar cliente"/><label><input type="checkbox" checked={includeInactive} onChange={(e)=>setIncludeInactive(e.target.checked)}/> Incluir inativos</label></div>}>
      {customers.length===0?<EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou faça o primeiro cadastro."/>:<div className="card-grid">{customers.map(c=><article className="info-card" key={c.id}>
        <div className="info-card-top"><div><h4>{c.nomeRazaoSocial}</h4><p>{c.telefone||"Telefone não informado"}</p></div><span className={`status-pill ${c.ativo?"status-aprovado":"status-cancelado"}`}>{c.ativo?CUSTOMER_TYPE_LABELS[c.tipoCliente]:"Inativo"}</span></div>
        <div className="info-card-body"><div><span>CPF / CNPJ</span><strong>{c.cpfCnpj||"Não informado"}</strong></div><div><span>Endereço</span><strong>{c.endereco||"Não informado"}</strong></div></div>
        <div className="card-actions"><button className="secondary-button" onClick={()=>edit(c)}>Editar</button><button className="secondary-button" onClick={()=>openMotos(c)}>Motos</button><button className={c.ativo?"danger-button":"secondary-button"} onClick={()=>toggle(c)}>{c.ativo?"Desativar":"Reativar"}</button></div>
      </article>)}</div>}
    </Panel>
    {selected&&<Panel title={`Motos de ${selected.nomeRazaoSocial}`} description="Veículos vinculados ao cadastro do cliente.">
      <form className="form-grid-pro" onSubmit={saveMoto}>
        <label>Marca<input required value={motoForm.marca} onChange={(e)=>setMotoForm({...motoForm,marca:e.target.value})}/></label><label>Modelo<input required value={motoForm.modelo} onChange={(e)=>setMotoForm({...motoForm,modelo:e.target.value})}/></label>
        <label>Ano<input type="number" value={motoForm.ano} onChange={(e)=>setMotoForm({...motoForm,ano:e.target.value})}/></label><label>Cilindrada<input value={motoForm.cilindrada} onChange={(e)=>setMotoForm({...motoForm,cilindrada:e.target.value})}/></label>
        <label>Placa<input value={motoForm.placa} onChange={(e)=>setMotoForm({...motoForm,placa:e.target.value})}/></label><div className="form-actions-pro"><button className="primary-button" disabled={!selected.ativo}>{motoForm.id?"Salvar moto":"Adicionar moto"}</button></div>
      </form>
      <div className="card-grid">{(motos[selected.id]||[]).map(m=><article className="info-card" key={m.id}><h4>{m.marca} {m.modelo}</h4><p>{[m.ano,m.cilindrada,m.placa].filter(Boolean).join(" · ")}</p><div className="card-actions"><button className="secondary-button" disabled={!selected.ativo} onClick={()=>setMotoForm({...initialMoto,...m,ano:m.ano||""})}>Editar</button><button className="danger-button" onClick={()=>removeMoto(m)}>Remover</button></div></article>)}</div>
    </Panel>}
  </div>;
}

export default function CustomersPage(props) {
  return BACKEND_API_ENABLED ? <BackendCustomersPage /> : <LegacyCustomersPage {...props} />;
}
