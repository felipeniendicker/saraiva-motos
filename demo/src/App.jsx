import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import {
  IconCustomers,
  IconDashboard,
  IconOrder,
  IconRevenue,
  IconSpark
} from "./components/icons.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { getCurrentUser, login } from "./services/authApi.js";
import { AUTH_UNAUTHORIZED_EVENT, clearAuthToken, getAuthToken, setAuthToken } from "./services/authSession.js";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    description: "Visão geral da operação",
    icon: <IconDashboard />
  },
  {
    to: "/vendas",
    label: "Vendas",
    description: "Atendimento e histórico",
    icon: <IconOrder />
  },
  {
    to: "/pecas",
    label: "Produtos / Peças",
    description: "Catálogo e preços",
    icon: <IconSpark />
  },
  {
    to: "/estoque",
    label: "Estoque",
    description: "Entradas, saídas e alertas",
    icon: <IconRevenue />
  },
  {
    to: "/clientes",
    label: "Clientes",
    description: "Cadastro e consulta",
    icon: <IconCustomers />
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    description: "Indicadores da operação",
    icon: <IconRevenue />
  }
];

const pageMeta = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Resumo das vendas, estoque e movimentações da Saraiva Motos."
  },
  "/vendas": {
    title: "Vendas",
    subtitle: "Atendimento no balcão e consulta das vendas realizadas."
  },
  "/clientes": {
    title: "Clientes",
    subtitle: "Cadastro unificado para recepção, consulta e atendimento."
  },
  "/pecas": {
    title: "Produtos / Peças",
    subtitle: "Catálogo de motopeças com aplicação, preços e níveis de estoque."
  },
  "/estoque": {
    title: "Estoque",
    subtitle: "Entradas, saídas, histórico e alertas para reposição."
  },
  "/relatorios": {
    title: "Relatórios",
    subtitle: "Indicadores de vendas, produtos, estoque e clientes."
  }
};

export default function App() {
  const [auth, setAuth] = useState({ status: "checking", user: null });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleUnauthorized() {
      setAuth({ status: "unauthenticated", user: null, message: "Sua sessão expirou. Entre novamente para continuar." });
      navigate("/login", { replace: true });
    }

    globalThis.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    const token = getAuthToken();
    if (!token) {
      setAuth({ status: "unauthenticated", user: null, message: "" });
      navigate("/login", { replace: true });
    } else {
      getCurrentUser()
        .then((user) => {
          setAuth({ status: "authenticated", user });
          if (location.pathname === "/login") navigate("/dashboard", { replace: true });
        })
        .catch((error) => {
          if (error?.status === 401) {
            handleUnauthorized();
            return;
          }
          setAuth({
            status: "unauthenticated",
            user: null,
            message: error?.message || "Não foi possível validar sua sessão. Verifique a conexão com o servidor."
          });
          navigate("/login", { replace: true });
        });
    }

    return () => globalThis.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function handleLogin(email, senha) {
    const result = await login(email, senha);
    setAuthToken(result.token);
    setAuth({ status: "authenticated", user: result.usuario });
    navigate("/dashboard", { replace: true });
  }

  function handleLogout() {
    clearAuthToken();
    setAuth({ status: "unauthenticated", user: null });
    navigate("/login", { replace: true });
  }

  if (auth.status === "checking") {
    return <main className="login-shell"><section className="login-card"><p>Validando sessão...</p></section></main>;
  }

  if (auth.status !== "authenticated") {
    return <LoginPage onLogin={handleLogin} sessionMessage={auth.message} />;
  }

  const meta = pageMeta[location.pathname] || pageMeta["/dashboard"];

  return (
    <div className="app-shell">
      <Sidebar items={navItems} />

      <main className="content-shell">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          actions={(
            <div className="session-actions">
              <span>{auth.user?.email}</span>
              <button className="ghost-button" type="button" onClick={handleLogout}>Sair</button>
            </div>
          )}
        />

        <div className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />
            <Route path="/vendas" element={<SalesPage />} />
            <Route path="/clientes" element={<CustomersPage />} />
            <Route path="/pecas" element={<ProductsPage />} />
            <Route path="/estoque" element={<InventoryPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
