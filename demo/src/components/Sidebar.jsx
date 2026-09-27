import { NavLink } from "react-router-dom";

export default function Sidebar({ items }) {
  return (
    <aside className="sidebar-shell">
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

      <div className="sidebar-highlight">
        <p>Gestão da loja</p>
        <strong>Vendas, produtos, estoque e clientes em um só lugar.</strong>
      </div>
    </aside>
  );
}
