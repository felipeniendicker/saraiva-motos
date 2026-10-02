import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import CustomerSalesHistory from "../components/CustomerSalesHistory.jsx";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "../data/domain.js";
import { formatPhone, normalizeText } from "../utils/formatters.js";
import { BACKEND_API_ENABLED } from "../services/productsApi.js";
import * as clientsApi from "../services/clientsApi.js";
import { listSales } from "../services/salesApi.js";

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
  const [sales, setSales] = useState({});
  const [motoForm, setMotoForm] = useState(initialMoto);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setCustomers(await clientsApi.listClients({ search, includeInactive })); }
    catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  useEffect(() => { load(); }, [search, includeInactive]);

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const saved = form.id ? await clientsApi.updateClient(form.id, form) : await clientsApi.createClient(form);
      if (selected?.id === saved.id) setSelected(saved);
      setForm(initialForm); setNotice({ type: "success", message: "Cliente salvo com sucesso." }); await load();
    } catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
  }
  async function toggle(customer) {
    if (!window.confirm(`Deseja ${customer.ativo ? "desativar" : "reativar"} ${customer.nomeRazaoSocial}?`)) return;
    setSaving(true);
    try {
      const updated = await (customer.ativo ? clientsApi.deactivateClient(customer.id) : clientsApi.reactivateClient(customer.id));
      if (selected?.id === customer.id) setSelected(updated);
      await load();
    }
    catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
  }
  async function openCustomer(customer) {
    try {
      const [loadedMotos, loadedSales] = await Promise.all([
        clientsApi.listClientMotorcycles(customer.id),
        listSales({ clientId: customer.id })
      ]);
      setSelected(customer);
      setMotoForm(initialMoto);
      setMotos((current) => ({ ...current, [customer.id]: loadedMotos }));
      setSales((current) => ({ ...current, [customer.id]: loadedSales }));
    }
    catch (error) { setNotice({ type: "error", message: error.message }); }
  }
  async function saveMoto(event) {
    event.preventDefault();
    if (saving) return;
    const payload = { ...motoForm, ano: motoForm.ano ? Number(motoForm.ano) : null };
    setSaving(true);
    try {
      if (motoForm.id) await clientsApi.updateMotorcycle(motoForm.id, payload); else await clientsApi.createMotorcycle(selected.id, payload);
      setMotoForm(initialMoto); await openCustomer(selected);
    } catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
  }
  async function removeMoto(moto) {
    if (!window.confirm(`Remover ${moto.marca} ${moto.modelo}?`)) return;
    setSaving(true);
    try { await clientsApi.deleteMotorcycle(moto.id); await openCustomer(selected); }
    catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
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
        <div className="form-actions-pro field-wide">{form.id&&<button type="button" className="secondary-button" disabled={saving} onClick={()=>setForm(initialForm)}>Cancelar</button>}<button className="primary-button" disabled={saving}>{saving?"Salvando...":"Salvar cliente"}</button></div>
      </form>
    </Panel>
    <Panel title="Clientes cadastrados" description="Consulte clientes ativos e inativos."
      action={<div className="form-actions-pro"><input className="search-input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar cliente"/><label><input type="checkbox" checked={includeInactive} onChange={(e)=>setIncludeInactive(e.target.checked)}/> Incluir inativos</label></div>}>
      {customers.length===0?<EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou faça o primeiro cadastro."/>:<div className="card-grid">{customers.map(c=><article className="info-card" key={c.id}>
        <div className="info-card-top"><div><h4>{c.nomeRazaoSocial}</h4><p>{c.telefone||"Telefone não informado"}</p></div><span className={`status-pill ${c.ativo?"status-aprovado":"status-cancelado"}`}>{c.ativo?CUSTOMER_TYPE_LABELS[c.tipoCliente]:"Inativo"}</span></div>
        <div className="info-card-body"><div><span>CPF / CNPJ</span><strong>{c.cpfCnpj||"Não informado"}</strong></div><div><span>Endereço</span><strong>{c.endereco||"Não informado"}</strong></div></div>
        <div className="card-actions"><button className="secondary-button" disabled={saving} onClick={()=>edit(c)}>Editar</button><button className="secondary-button" disabled={saving} onClick={()=>openCustomer(c)}>Abrir cliente</button><button disabled={saving} className={c.ativo?"danger-button":"secondary-button"} onClick={()=>toggle(c)}>{c.ativo?"Desativar":"Reativar"}</button></div>
      </article>)}</div>}
    </Panel>
    {selected&&<Panel title={selected.nomeRazaoSocial} description="Dados, motos e histórico comercial do cliente." action={<span className={`status-pill ${selected.ativo?"status-aprovado":"status-cancelado"}`}>{selected.ativo?CUSTOMER_TYPE_LABELS[selected.tipoCliente]:"Inativo"}</span>}>
      <div className="customer-profile-summary">
        <div><span>Telefone</span><strong>{selected.telefone||"Não informado"}</strong></div>
        <div><span>CPF / CNPJ</span><strong>{selected.cpfCnpj||"Não informado"}</strong></div>
        <div><span>Endereço</span><strong>{selected.endereco||"Não informado"}</strong></div>
        <div><span>Cadastro</span><strong>{selected.dataCadastro?new Date(selected.dataCadastro).toLocaleDateString("pt-BR"):"Não informado"}</strong></div>
        <div className="field-wide"><span>Observações comerciais</span><strong>{selected.observacoes||"Sem observações"}</strong></div>
      </div>
      <div className="section-heading-inline"><div><h3>Motos</h3><p>Veículos vinculados ao cliente.</p></div></div>
      <form className="form-grid-pro" onSubmit={saveMoto}>
        <label>Marca<input required value={motoForm.marca} onChange={(e)=>setMotoForm({...motoForm,marca:e.target.value})}/></label><label>Modelo<input required value={motoForm.modelo} onChange={(e)=>setMotoForm({...motoForm,modelo:e.target.value})}/></label>
        <label>Ano<input type="number" value={motoForm.ano} onChange={(e)=>setMotoForm({...motoForm,ano:e.target.value})}/></label><label>Cilindrada<input value={motoForm.cilindrada} onChange={(e)=>setMotoForm({...motoForm,cilindrada:e.target.value})}/></label>
        <label>Placa<input value={motoForm.placa} onChange={(e)=>setMotoForm({...motoForm,placa:e.target.value.toUpperCase()})}/></label><label className="field-wide">Observações<textarea rows={2} value={motoForm.observacoes} onChange={(e)=>setMotoForm({...motoForm,observacoes:e.target.value})}/></label><div className="form-actions-pro field-wide">{motoForm.id&&<button type="button" className="secondary-button" disabled={saving} onClick={()=>setMotoForm(initialMoto)}>Cancelar edição</button>}<button className="primary-button" disabled={!selected.ativo||saving}>{saving?"Salvando...":motoForm.id?"Salvar moto":"Adicionar moto"}</button></div>
      </form>
      {(motos[selected.id]||[]).length===0?<EmptyState title="Nenhuma moto cadastrada" description="Este cliente ainda não possui motos vinculadas."/>:<div className="card-grid">{motos[selected.id].map(m=><article className="info-card" key={m.id}><h4>{m.marca} {m.modelo}</h4><p>{[m.ano,m.cilindrada,m.placa].filter(Boolean).join(" · ")}</p>{m.observacoes&&<p>{m.observacoes}</p>}<div className="card-actions"><button className="secondary-button" disabled={!selected.ativo||saving} onClick={()=>setMotoForm({...initialMoto,...m,ano:m.ano||""})}>Editar</button><button className="danger-button" disabled={saving} onClick={()=>removeMoto(m)}>Remover</button></div></article>)}</div>}
      <CustomerSalesHistory customer={selected} sales={sales[selected.id]||[]} />
    </Panel>}
  </div>;
}

export default function CustomersPage(props) {
  return BACKEND_API_ENABLED ? <BackendCustomersPage /> : <LegacyCustomersPage {...props} />;
}
