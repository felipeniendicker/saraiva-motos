import { formatMonthLabel, getCurrentMonthValue } from "../utils/formatters.js";

export default function Header({ title, subtitle, actions, menuOpen, menuButtonRef, onMenuToggle }) {
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <header className="page-top">
      <button
        ref={menuButtonRef}
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? "Fechar menu principal" : "Abrir menu principal"}
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={onMenuToggle}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
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
