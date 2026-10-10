import { useEffect, useRef, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import CustomerSalesHistory from "../components/CustomerSalesHistory.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, PRICE_TYPE_LABELS, getDefaultPriceType } from "../data/domain.js";
import { formatPhone } from "../utils/formatters.js";
import * as clientsApi from "../services/clientsApi.js";
import { listSales } from "../services/salesApi.js";
import { CUSTOMER_PROFILE_TABS, getNextCustomerProfileTab } from "../services/customerProfileTabs.js";

const initialForm = {
  id: "", nomeRazaoSocial: "", telefone: "", cpfCnpj: "",
  tipoCliente: "CLIENTE_COMUM", endereco: "", observacoes: ""
};
const initialMoto = { marca: "", modelo: "", ano: "", cilindrada: "", placa: "", observacoes: "" };
const PROFILE_TAB_LABELS = { dados: "Dados", motos: "Motos", compras: "Compras" };

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
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [formExpanded, setFormExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  const [confirmation, setConfirmation] = useState(null);
  const profileRef = useRef(null);
  const listRequestRef = useRef(0);
  const profileRequestRef = useRef(0);

  async function load() {
    const requestId = ++listRequestRef.current;
    setListLoading(true);
    setListError("");
    try {
      const loadedCustomers = await clientsApi.listClients({ search, includeInactive });
      if (requestId === listRequestRef.current) setCustomers(loadedCustomers);
    }
    catch (error) { if (requestId === listRequestRef.current) setListError(error.message); }
    finally { if (requestId === listRequestRef.current) setListLoading(false); }
  }
  useEffect(() => { load(); }, [search, includeInactive]);

  function startNewCustomer() {
    setForm(initialForm);
    setFormExpanded(true);
    requestAnimationFrame(() => document.querySelector("#customer-form input")?.focus());
  }
  function edit(customer) {
    setForm({ ...initialForm, ...customer });
    setFormExpanded(true);
    requestAnimationFrame(() => document.querySelector("#customer-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function closeForm() {
    setForm(initialForm);
    setFormExpanded(false);
  }
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const saved = form.id ? await clientsApi.updateClient(form.id, form) : await clientsApi.createClient(form);
      if (selected?.id === saved.id) setSelected(saved);
      closeForm();
      setNotice({ type: "success", message: "Cliente salvo com sucesso." });
      await load();
    } catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
  }
  function requestToggle(customer) {
    setConfirmation({ kind: "customer", customer });
  }
  async function toggle(customer) {
    setSaving(true);
    try {
      const updated = await (customer.ativo ? clientsApi.deactivateClient(customer.id) : clientsApi.reactivateClient(customer.id));
      if (selected?.id === customer.id) setSelected(updated);
      setNotice({ type: "success", message: `Cliente ${updated.ativo ? "reativado" : "desativado"} com sucesso.` });
      await load();
    } catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
  }
  async function openCustomer(customer, { preserveTab = false, focusProfile = true } = {}) {
    const requestId = ++profileRequestRef.current;
    setSelected(customer);
    setProfileLoading(true);
    setProfileError("");
    if (!preserveTab) setActiveTab("dados");
    setMotoForm(initialMoto);
    if (focusProfile) requestAnimationFrame(() => profileRef.current?.focus());
    try {
      const [loadedMotos, loadedSales] = await Promise.all([
        clientsApi.listClientMotorcycles(customer.id), listSales({ clientId: customer.id })
      ]);
      if (requestId !== profileRequestRef.current) return;
      setMotos((current) => ({ ...current, [customer.id]: loadedMotos }));
      setSales((current) => ({ ...current, [customer.id]: loadedSales }));
    } catch (error) {
      if (requestId === profileRequestRef.current) {
        setProfileError(error.message);
        setNotice({ type: "error", message: error.message });
      }
    }
    finally { if (requestId === profileRequestRef.current) setProfileLoading(false); }
  }
  async function saveMoto(event) {
    event.preventDefault();
    if (saving) return;
    const payload = { ...motoForm, ano: motoForm.ano ? Number(motoForm.ano) : null };
    setSaving(true);
    try {
      if (motoForm.id) await clientsApi.updateMotorcycle(motoForm.id, payload);
      else await clientsApi.createMotorcycle(selected.id, payload);
      setMotoForm(initialMoto);
      setNotice({ type: "success", message: "Moto salva com sucesso." });
      await openCustomer(selected, { preserveTab: true, focusProfile: false });
    } catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
  }
  function requestRemoveMoto(moto) {
    setConfirmation({ kind: "moto", moto });
  }
  async function removeMoto(moto) {
    setSaving(true);
    try {
      await clientsApi.deleteMotorcycle(moto.id);
      setNotice({ type: "success", message: "Moto removida com sucesso." });
      await openCustomer(selected, { preserveTab: true, focusProfile: false });
    } catch (error) { setNotice({ type: "error", message: error.message }); }
    finally { setSaving(false); }
  }
  function closeSelected() {
    profileRequestRef.current += 1;
    setSelected(null);
    setMotoForm(initialMoto);
    setActiveTab("dados");
    setProfileError("");
  }
  function handleTabKeyDown(event) {
    const nextTab = getNextCustomerProfileTab(activeTab, event.key);
    if (nextTab === activeTab) return;
    event.preventDefault();
    setActiveTab(nextTab);
    requestAnimationFrame(() => document.querySelector(`#customer-tab-${nextTab}`)?.focus());
  }

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const hasSearch = search.trim().length > 0;

  return <div className="page-stack customers-page">
    {notice && <div className={`pdv-notice notice-${notice.type}`} role="status">{notice.message}</div>}

    {formExpanded && <Panel title={form.id ? "Editar cliente" : "Novo cliente"} description="Dados cadastrais e comerciais do cliente.">
      <form id="customer-form" className="form-grid-pro customer-form" onSubmit={save}>
        <label>Nome / razão social<input value={form.nomeRazaoSocial} onChange={(event) => update("nomeRazaoSocial", event.target.value)} required /></label>
        <label>Tipo de cliente<select value={form.tipoCliente} onChange={(event) => update("tipoCliente", event.target.value)}>{CUSTOMER_TYPES.map((type) => <option key={type} value={type}>{CUSTOMER_TYPE_LABELS[type]}</option>)}</select></label>
        <label>Telefone<input value={form.telefone} onChange={(event) => update("telefone", formatPhone(event.target.value))} /></label>
        <label>CPF / CNPJ<input value={form.cpfCnpj} onChange={(event) => update("cpfCnpj", event.target.value)} /></label>
        <label className="field-wide">Endereço<input value={form.endereco} onChange={(event) => update("endereco", event.target.value)} /></label>
        <label className="field-wide">Observações<textarea value={form.observacoes} onChange={(event) => update("observacoes", event.target.value)} rows={3} /></label>
        <div className="form-actions-pro field-wide"><button type="button" className="secondary-button" disabled={saving} onClick={closeForm}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar cliente"}</button></div>
      </form>
    </Panel>}

    <div className={`customers-workspace${selected ? " has-selection" : ""}`}>
      <section className="customers-list-section" aria-label="Busca e lista de clientes">
        <Panel title="Clientes" description="Localize e consulte clientes cadastrados." action={<button type="button" className="primary-button" onClick={startNewCustomer}>Novo cliente</button>}>
          <div className="customer-search-tools">
            <label className="customer-search-field">Buscar cliente<input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, documento ou telefone" /></label>
            <label className="checkbox-control"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} /> Incluir inativos</label>
          </div>
          {listLoading ? <div className="section-loading" role="status"><span className="loading-indicator" aria-hidden="true" />Carregando clientes...</div>
            : listError ? <div className="customer-load-error" role="alert"><p>{listError}</p><button type="button" className="secondary-button" onClick={load}>Tentar novamente</button></div>
              : customers.length === 0 ? <EmptyState title={hasSearch ? "Nenhum resultado para esta busca" : "Nenhum cliente cadastrado"} description={hasSearch ? "Revise o termo pesquisado ou limpe a busca." : "Cadastre o primeiro cliente para começar."} />
                : <div className="customers-list">{customers.map((customer) => {
                  const priceType = getDefaultPriceType(customer);
                  return <article className={`customer-list-card${selected?.id === customer.id ? " is-selected" : ""}`} key={customer.id}>
                    <div className="customer-card-heading"><div><h4>{customer.nomeRazaoSocial}</h4><p>{customer.telefone || "Telefone não informado"}</p></div><span className={`status-pill ${customer.ativo ? "status-aprovado" : "status-cancelado"}`}>{customer.ativo ? "Ativo" : "Inativo"}</span></div>
                    <div className="customer-card-badges"><span className="customer-type-badge">{CUSTOMER_TYPE_LABELS[customer.tipoCliente]}</span><span className={`price-type-badge price-${priceType.toLowerCase()}`}>Preço padrão: {PRICE_TYPE_LABELS[priceType]}</span></div>
                    {customer.cpfCnpj && <p className="customer-document"><span>CPF / CNPJ</span><strong>{customer.cpfCnpj}</strong></p>}
                    <div className="customer-card-actions"><button type="button" className="primary-button" disabled={saving} onClick={() => openCustomer(customer)}>Abrir</button><button type="button" className="secondary-button" disabled={saving} onClick={() => edit(customer)}>Editar</button><button type="button" disabled={saving} className={customer.ativo ? "customer-destructive-action" : "secondary-button"} onClick={() => requestToggle(customer)}>{customer.ativo ? "Desativar" : "Reativar"}</button></div>
                  </article>;
                })}</div>}
        </Panel>
      </section>

      {selected && <section className="customer-profile-section" aria-label={`Perfil de ${selected.nomeRazaoSocial}`} ref={profileRef} tabIndex={-1}>
        <Panel>
          <button type="button" className="secondary-button customer-profile-back" onClick={closeSelected}>Voltar aos clientes</button>
          <div className="customer-profile-header">
            <div><span className="eyebrow">Cliente selecionado</span><h3>{selected.nomeRazaoSocial}</h3><p>{selected.telefone || "Telefone não informado"}</p></div>
            <div className="customer-profile-badges"><span className="customer-type-badge">{CUSTOMER_TYPE_LABELS[selected.tipoCliente]}</span><span className={`status-pill ${selected.ativo ? "status-aprovado" : "status-cancelado"}`}>{selected.ativo ? "Ativo" : "Inativo"}</span><span className={`price-type-badge price-${getDefaultPriceType(selected).toLowerCase()}`}>Preço padrão: {PRICE_TYPE_LABELS[getDefaultPriceType(selected)]}</span></div>
          </div>
          <div className="customer-profile-tabs" role="tablist" aria-label="Seções do perfil do cliente">
            {CUSTOMER_PROFILE_TABS.map((tab) => <button type="button" role="tab" id={`customer-tab-${tab}`} aria-selected={activeTab === tab} aria-controls={`customer-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => setActiveTab(tab)} onKeyDown={handleTabKeyDown}>{PROFILE_TAB_LABELS[tab]}</button>)}
          </div>
          {profileLoading ? <div className="section-loading customer-profile-loading" role="status"><span className="loading-indicator" aria-hidden="true" />Carregando perfil...</div>
            : profileError ? <div className="customer-load-error" role="alert"><p>{profileError}</p><button type="button" className="secondary-button" onClick={() => openCustomer(selected, { preserveTab: true, focusProfile: false })}>Tentar novamente</button></div> : <>
            <div role="tabpanel" id="customer-panel-dados" aria-labelledby="customer-tab-dados" hidden={activeTab !== "dados"}>
              <div className="customer-profile-summary">
                <div><span>Telefone</span><strong>{selected.telefone || "Não informado"}</strong></div><div><span>CPF / CNPJ</span><strong>{selected.cpfCnpj || "Não informado"}</strong></div>
                <div><span>Endereço</span><strong>{selected.endereco || "Não informado"}</strong></div><div><span>Cadastro</span><strong>{selected.dataCadastro ? new Date(selected.dataCadastro).toLocaleDateString("pt-BR") : "Não informado"}</strong></div>
                <div className="field-wide"><span>Observações comerciais</span><strong>{selected.observacoes || "Sem observações"}</strong></div>
              </div>
            </div>
            <div role="tabpanel" id="customer-panel-motos" aria-labelledby="customer-tab-motos" hidden={activeTab !== "motos"}>
              <div className="section-heading-inline"><div><h3>Motos</h3><p>Veículos vinculados ao cliente.</p></div></div>
              <form className="form-grid-pro customer-moto-form" onSubmit={saveMoto}>
                <label>Marca<input required value={motoForm.marca} onChange={(event) => setMotoForm({ ...motoForm, marca: event.target.value })} /></label><label>Modelo<input required value={motoForm.modelo} onChange={(event) => setMotoForm({ ...motoForm, modelo: event.target.value })} /></label>
                <label>Ano<input type="number" value={motoForm.ano} onChange={(event) => setMotoForm({ ...motoForm, ano: event.target.value })} /></label><label>Cilindrada<input value={motoForm.cilindrada} onChange={(event) => setMotoForm({ ...motoForm, cilindrada: event.target.value })} /></label>
                <label>Placa<input value={motoForm.placa} onChange={(event) => setMotoForm({ ...motoForm, placa: event.target.value.toUpperCase() })} /></label><label className="field-wide">Observações<textarea rows={2} value={motoForm.observacoes} onChange={(event) => setMotoForm({ ...motoForm, observacoes: event.target.value })} /></label>
                <div className="form-actions-pro field-wide">{motoForm.id && <button type="button" className="secondary-button" disabled={saving} onClick={() => setMotoForm(initialMoto)}>Cancelar edição</button>}<button className="primary-button" disabled={!selected.ativo || saving}>{saving ? "Salvando..." : motoForm.id ? "Salvar moto" : "Adicionar moto"}</button></div>
              </form>
              {(motos[selected.id] || []).length === 0 ? <EmptyState title="Nenhuma moto cadastrada" description={selected.ativo ? "Adicione uma moto usando o formulário acima." : "Este cliente não possui motos vinculadas."} /> : <div className="customer-motos-grid">{motos[selected.id].map((moto) => <article className="customer-moto-card" key={moto.id}>
                <div><h4>{moto.marca} {moto.modelo}</h4><p>{[moto.ano, moto.cilindrada, moto.placa].filter(Boolean).join(" · ") || "Detalhes não informados"}</p></div>{moto.observacoes && <p className="customer-moto-notes">{moto.observacoes}</p>}
                <div className="card-actions"><button type="button" className="secondary-button" disabled={!selected.ativo || saving} onClick={() => setMotoForm({ ...initialMoto, ...moto, ano: moto.ano || "" })}>Editar</button><button type="button" className="danger-button" disabled={saving} onClick={() => requestRemoveMoto(moto)}>Remover</button></div>
              </article>)}</div>}
            </div>
            <div role="tabpanel" id="customer-panel-compras" aria-labelledby="customer-tab-compras" hidden={activeTab !== "compras"}><CustomerSalesHistory key={selected.id} customer={selected} sales={sales[selected.id] || []} /></div>
          </>}
        </Panel>
      </section>}
    </div>
    <ConfirmDialog
      open={Boolean(confirmation)}
      title={confirmation?.kind === "moto" ? "Remover moto" : confirmation?.customer?.ativo ? "Desativar cliente" : "Reativar cliente"}
      message={confirmation?.kind === "moto" ? `Deseja remover ${confirmation.moto.marca} ${confirmation.moto.modelo}?` : confirmation ? `Deseja ${confirmation.customer.ativo ? "desativar" : "reativar"} ${confirmation.customer.nomeRazaoSocial}?` : ""}
      confirmLabel={confirmation?.kind === "moto" ? "Remover moto" : confirmation?.customer?.ativo ? "Desativar cliente" : "Reativar cliente"}
      variant={confirmation?.kind === "moto" || confirmation?.customer?.ativo ? "danger" : "default"}
      processing={saving}
      onCancel={() => setConfirmation(null)}
      onConfirm={async () => {
        if (confirmation.kind === "moto") await removeMoto(confirmation.moto);
        else await toggle(confirmation.customer);
        setConfirmation(null);
      }}
    />
  </div>;
}

export default function CustomersPage() { return <BackendCustomersPage />; }
