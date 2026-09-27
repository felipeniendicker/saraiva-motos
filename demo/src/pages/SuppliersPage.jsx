import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import Panel from "../components/Panel.jsx";
import { formatPhone, normalizeText } from "../utils/formatters.js";

const initialForm = { id: "", name: "", phone: "", company: "", notes: "" };

export default function SuppliersPage({ db, onSave, onDelete }) {
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const suppliers = useMemo(() => db.suppliers.filter((supplier) => {
    const query = normalizeText(search);
    return !query || [supplier.name, supplier.company, supplier.phone].some((value) => normalizeText(value || "").includes(query));
  }), [db.suppliers, search]);

  function submit(event) {
    event.preventDefault();
    onSave(form);
    setForm(initialForm);
  }

  return <div className="page-stack">
    <Panel title={form.id ? "Editar fornecedor" : "Cadastrar fornecedor"} description="Contatos básicos para facilitar compras e reposição de peças.">
      <form className="form-grid-pro" onSubmit={submit}>
        <label>Nome do contato<input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required /></label>
        <label>Telefone<input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: formatPhone(e.target.value) }))} required /></label>
        <label className="field-wide">Empresa<input value={form.company} onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))} required /></label>
        <label className="field-wide">Observações<textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={3} /></label>
        <div className="form-actions-pro field-wide">{form.id && <button type="button" className="secondary-button" onClick={() => setForm(initialForm)}>Cancelar edição</button>}<button className="primary-button">{form.id ? "Salvar alterações" : "Cadastrar fornecedor"}</button></div>
      </form>
    </Panel>
    <Panel title="Fornecedores cadastrados" description="Contatos comerciais usados pela Saraiva Motos." action={<input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar fornecedor" />}>
      {suppliers.length === 0 ? <EmptyState title="Nenhum fornecedor encontrado" description="Cadastre um contato para iniciar a lista." /> : <div className="card-grid">{suppliers.map((supplier) => <article key={supplier.id} className="info-card"><div className="info-card-top"><div><h4>{supplier.company}</h4><p>{supplier.name}</p></div><span className="plate-badge">Fornecedor</span></div><div className="info-card-body"><div><span>Telefone</span><strong>{supplier.phone}</strong></div><div className="field-wide"><span>Observações</span><strong>{supplier.notes || "Sem observações."}</strong></div></div><div className="card-actions"><button className="secondary-button" onClick={() => setForm(supplier)}>Editar</button><button className="danger-button" onClick={() => onDelete(supplier)}>Excluir</button></div></article>)}</div>}
    </Panel>
  </div>;
}
