import { formatMonthLabel, getCurrentMonthValue } from "../utils/formatters.js";

export default function Header({ title, subtitle, actions }) {
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <header className="page-top">
      <div>
        <div className="eyebrow">Saraiva Motos · Painel operacional</div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="page-top-actions">
        <div className="header-badge">
          <span>{today}</span>
          <strong>{formatMonthLabel(getCurrentMonthValue())}</strong>
        </div>
        {actions}
      </div>
    </header>
  );
}
