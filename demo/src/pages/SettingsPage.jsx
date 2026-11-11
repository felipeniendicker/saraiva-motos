import { useEffect, useState } from "react";
import Panel from "../components/Panel.jsx";
import { useCompanySettings } from "../context/CompanySettingsContext.jsx";
import {
  formatCnpjInput,
  formatPhoneInput,
  normalizeCompanySettings,
  validateCompanySettings
} from "../services/companySettings.js";

export default function SettingsPage() {
  const { settings, loading, error: loadError, save } = useCompanySettings();
  const [form, setForm] = useState(() => normalizeCompanySettings(settings));
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(normalizeCompanySettings(settings));
  }, [settings]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  async function submit(event) {
    event.preventDefault();
    const validationMessage = validateCompanySettings(form);
    if (validationMessage) {
      setFeedback({ type: "danger", message: validationMessage });
      return;
    }
    setSaving(true);
    try {
      await save(form);
      setFeedback({ type: "success", message: "Dados da empresa atualizados com sucesso." });
    } catch (failure) {
      setFeedback({ type: "danger", message: failure.message });
    } finally {
      setSaving(false);
    }
  }

  return <div className="page-stack settings-page">
    <Panel
      title="Dados da Empresa"
      description="Estas informações serão usadas nos novos comprovantes, orçamentos, extratos e fechamentos de caixa."
    >
      {loadError && <div className="feedback-message feedback-danger" role="alert">{loadError}</div>}
      {feedback && <div className={`feedback-message feedback-${feedback.type}`} role="status">{feedback.message}</div>}
      <form className="form-grid-pro company-settings-form" onSubmit={submit}>
        <label>
          Nome fantasia
          <input value={form.nomeFantasia} maxLength="180" disabled={loading || saving} onChange={(event) => update("nomeFantasia", event.target.value)} required />
        </label>
        <label>
          Razão social
          <input value={form.razaoSocial} maxLength="180" disabled={loading || saving} onChange={(event) => update("razaoSocial", event.target.value)} required />
        </label>
        <label>
          CNPJ
          <input value={form.cnpj} maxLength="18" inputMode="numeric" placeholder="00.000.000/0000-00" disabled={loading || saving} onChange={(event) => update("cnpj", formatCnpjInput(event.target.value))} />
        </label>
        <label>
          Telefone / WhatsApp
          <input value={form.telefone} maxLength="15" inputMode="tel" placeholder="(00) 00000-0000" disabled={loading || saving} onChange={(event) => update("telefone", formatPhoneInput(event.target.value))} />
        </label>
        <label className="field-wide">
          Endereço completo
          <textarea value={form.endereco} maxLength="500" rows="3" disabled={loading || saving} onChange={(event) => update("endereco", event.target.value)} />
        </label>
        <label className="field-wide">
          E-mail
          <input type="email" value={form.email} maxLength="254" placeholder="contato@empresa.com.br" disabled={loading || saving} onChange={(event) => update("email", event.target.value)} />
        </label>
        <div className="form-actions-pro field-wide">
          <button className="primary-button" disabled={loading || saving}>{saving ? "Salvando..." : "Salvar dados da empresa"}</button>
        </div>
      </form>
    </Panel>
  </div>;
}
