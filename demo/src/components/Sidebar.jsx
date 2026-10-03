import { NavLink } from "react-router-dom";

export default function Sidebar({ items, isOpen = false, userEmail, onClose, onDismiss, onLogout }) {
  return (
    <aside id="main-navigation" className={`sidebar-shell${isOpen ? " is-open" : ""}`} aria-label="Menu principal">
      <button className="drawer-close" type="button" aria-label="Fechar menu principal" onClick={onDismiss}>×</button>
      <div className="brand-block">
        <div className="brand-mark" title="Espaço reservado para a logo oficial">SM</div>
        <div>
          <h1>Saraiva Motos</h1>
          <p>Motopeças & Atendimento</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " is-active" : ""}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="drawer-session">
        <span title={userEmail}>{userEmail}</span>
        <button className="ghost-button" type="button" onClick={onLogout}>Sair</button>
      </div>

      <div className="sidebar-highlight">
        <p>Gestão da loja</p>
        <strong>Vendas, produtos, estoque e clientes em um só lugar.</strong>
      </div>
    </aside>
  );
}
