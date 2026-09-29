import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Toast from "./components/Toast.jsx";
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
import { hasDuplicateBarcode, normalizeBarcode } from "./services/productLookup.js";
import { BACKEND_API_ENABLED } from "./services/productsApi.js";
import { cancelSale, completeSale } from "./services/sales.js";
import { loadDatabase, saveDatabase } from "./services/storage.js";
import { initializeRuntimeDatabase, saveRuntimeDatabase } from "./services/runtimeDatabase.js";
import { createId } from "./utils/formatters.js";

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
  const [db, setDb] = useState(() => initializeRuntimeDatabase(BACKEND_API_ENABLED, loadDatabase));
  const [toast, setToast] = useState(null);
  const [auth, setAuth] = useState(() => ({ status: BACKEND_API_ENABLED ? "checking" : "authenticated", user: null }));
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!BACKEND_API_ENABLED) return undefined;

    function handleUnauthorized() {
      setAuth({ status: "unauthenticated", user: null });
      navigate("/login", { replace: true });
    }

    globalThis.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
    } else {
      getCurrentUser()
        .then((user) => {
          setAuth({ status: "authenticated", user });
          if (location.pathname === "/login") navigate("/dashboard", { replace: true });
        })
        .catch(handleUnauthorized);
    }

    return () => globalThis.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function persist(updater, nextToast) {
    setDb((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      saveRuntimeDatabase(BACKEND_API_ENABLED, saveDatabase, next);
      return next;
    });

    if (nextToast) {
      setToast(nextToast);
    }
  }

  function handleSaveCustomer(form) {
    if (!form.nomeRazaoSocial) {
      setToast({ type: "warning", title: "Nome obrigatório", message: "Informe o nome ou a razão social do cliente." });
      return false;
    }

    persist((current) => ({
      ...current,
      customers: form.id
        ? current.customers.map((customer) => customer.id === form.id ? { ...customer, ...form } : customer)
        : [{ ...form, id: createId("cli"), ativo: true, dataCadastro: new Date().toISOString() }, ...current.customers]
    }), {
      type: "success",
      title: "Cliente salvo",
      message: "Os dados do cliente foram atualizados."
    });
    return true;
  }

  function handleToggleCustomer(customer) {
    const action = customer.ativo ? "desativar" : "reativar";
    if (!window.confirm(`Deseja ${action} ${customer.nomeRazaoSocial}?`)) {
      return;
    }

    persist((current) => ({
      ...current,
      customers: current.customers.map((item) => item.id === customer.id ? { ...item, ativo: !item.ativo } : item)
    }), {
      type: "warning",
      title: customer.ativo ? "Cliente desativado" : "Cliente reativado",
      message: "O histórico e os vínculos do cliente foram preservados."
    });
  }

  function handleSaveProduct(form) {
    const normalizedBarcode = normalizeBarcode(form.codigoBarras);
    if (!form.nome) {
      setToast({ type: "warning", title: "Nome obrigatório", message: "Informe o nome do produto." });
      return false;
    }
    if ([form.valorCusto, form.precoVarejo, form.precoRevenda, form.quantidadeEstoque, form.estoqueMinimo].some((value) => !Number.isFinite(value) || value < 0)) {
      setToast({ type: "warning", title: "Valor inválido", message: "Preços e quantidades não podem ser negativos." });
      return false;
    }
    const duplicatedBarcode = hasDuplicateBarcode(db.products, normalizedBarcode, form.id);
    if (duplicatedBarcode) {
      setToast({ type: "warning", title: "Código de barras já cadastrado", message: "Informe um código de barras diferente." });
      return false;
    }

    persist((current) => ({
      ...current,
      products: form.id
        ? current.products.map((product) => product.id === form.id ? { ...product, ...form, codigoBarras: normalizedBarcode } : product)
        : [{ ...form, codigoBarras: normalizedBarcode, id: createId("pec"), ativo: true, dataCadastro: new Date().toISOString() }, ...current.products]
    }), {
      type: "success",
      title: "Peça salva",
      message: "O catálogo e os dados de estoque foram atualizados."
    });
    return true;
  }

  function handleToggleProduct(product) {
    const action = product.ativo ? "desativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o produto ${product.nome}?`)) return;
    persist((current) => ({
      ...current,
      products: current.products.map((item) => item.id === product.id ? { ...item, ativo: !item.ativo } : item)
    }), { type: "warning", title: product.ativo ? "Produto desativado" : "Produto reativado", message: "O histórico de estoque foi preservado." });
  }

  function handleStockMovement(form) {
    const product = db.products.find((item) => item.id === form.produtoId);
    if (!product) return;
    const isEntry = form.tipo === "ENTRADA" || form.tipo === "AJUSTE_ENTRADA" || form.tipo === "CANCELAMENTO_VENDA";
    if (!isEntry && form.quantidade > product.quantidadeEstoque) {
      setToast({ type: "warning", title: "Estoque insuficiente", message: `Há apenas ${product.quantidadeEstoque} unidade(s) disponível(is).` });
      return;
    }
    const estoqueAnterior = product.quantidadeEstoque;
    const estoquePosterior = estoqueAnterior + (isEntry ? form.quantidade : -form.quantidade);
    persist((current) => ({
      ...current,
      products: current.products.map((item) => item.id === form.produtoId ? { ...item, quantidadeEstoque: estoquePosterior } : item),
      stockMovements: [{
        id: createId("mov"),
        produtoId: form.produtoId,
        tipo: form.tipo,
        quantidade: form.quantidade,
        estoqueAnterior,
        estoquePosterior,
        motivo: form.motivo,
        vendaId: null,
        dataHora: new Date().toISOString()
      }, ...current.stockMovements]
    }), { type: "success", title: "Estoque atualizado", message: `Movimentação de ${form.quantidade} unidade(s) registrada.` });
  }

  function handleFinalizeSale(draft) {
    const result = completeSale(db, draft);
    if (!result.ok) {
      setToast({ type: "warning", title: "Venda não concluída", message: result.message });
      return result;
    }

    persist(result.database, {
      type: "success",
      title: `Venda ${result.sale.numeroVenda} concluída`,
      message: "Estoque e movimentações foram atualizados."
    });
    return result;
  }

  function handleCancelSale(saleId, reason) {
    const result = cancelSale(db, saleId, reason);
    if (!result.ok) {
      setToast({ type: "warning", title: "Cancelamento não concluído", message: result.message });
      return result;
    }

    persist(result.database, {
      type: "success",
      title: `Venda ${result.sale.numeroVenda} cancelada`,
      message: "Os itens foram devolvidos ao estoque."
    });
    return result;
  }

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

  if (BACKEND_API_ENABLED && auth.status === "checking") {
    return <main className="login-shell"><section className="login-card"><p>Validando sessão...</p></section></main>;
  }

  if (BACKEND_API_ENABLED && auth.status !== "authenticated") {
    return <LoginPage onLogin={handleLogin} />;
  }

  const meta = pageMeta[location.pathname] || pageMeta["/dashboard"];

  return (
    <div className="app-shell">
      <Sidebar items={navItems} />

      <main className="content-shell">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          actions={BACKEND_API_ENABLED ? (
            <div className="session-actions">
              <span>{auth.user?.email}</span>
              <button className="ghost-button" type="button" onClick={handleLogout}>Sair</button>
            </div>
          ) : null}
        />

        <div className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<DashboardPage db={db} />}
            />
            <Route path="/vendas" element={<SalesPage db={db} onFinalizeSale={handleFinalizeSale} onCancelSale={handleCancelSale} />} />
            <Route
              path="/clientes"
              element={
                <CustomersPage
                  db={db}
                  onSave={handleSaveCustomer}
                  onToggleActive={handleToggleCustomer}
                />
              }
            />
            <Route path="/pecas" element={<ProductsPage db={db} onSave={handleSaveProduct} onToggleActive={handleToggleProduct} />} />
            <Route path="/estoque" element={<InventoryPage db={db} onMovement={handleStockMovement} />} />
            <Route path="/relatorios" element={<ReportsPage db={db} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
