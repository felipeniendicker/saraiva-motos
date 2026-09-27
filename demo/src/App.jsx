import { useEffect, useMemo, useState } from "react";
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
import QuotesPage from "./pages/QuotesPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import BillingPage from "./pages/BillingPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import SuppliersPage from "./pages/SuppliersPage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import { hasDuplicateBarcode, normalizeBarcode } from "./services/productLookup.js";
import { cancelSale, completeSale } from "./services/sales.js";
import { loadDatabase, saveDatabase } from "./services/storage.js";
import { createId, getCurrentMonthValue } from "./utils/formatters.js";

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
  },
  "/orcamentos": {
    title: "Orçamentos",
    subtitle: "Simulação profissional de peças, mão de obra e aprovação."
  },
  "/ordens-servico": {
    title: "Serviços / Oficina",
    subtitle: "Acompanhamento visual do fluxo de execução da oficina."
  },
  "/fornecedores": {
    title: "Fornecedores",
    subtitle: "Contatos comerciais para compras e reposição de peças."
  },
  "/faturamento": {
    title: "Faturamento",
    subtitle: "Resultados financeiros calculados a partir das OS finalizadas."
  }
};

function buildOrderStatus(order, status) {
  if (status === "Finalizado") {
    return {
      ...order,
      status,
      completedAt: order.completedAt || new Date().toISOString().slice(0, 10)
    };
  }

  return {
    ...order,
    status,
    completedAt: null
  };
}

export default function App() {
  const [db, setDb] = useState(() => loadDatabase());
  const [toast, setToast] = useState(null);
  const [billingMonth, setBillingMonth] = useState(getCurrentMonthValue());
  const [orderDraft, setOrderDraft] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const insights = useMemo(() => {
    const customerMap = new Map(db.customers.map((customer) => [customer.id, customer]));
    const bikeMap = new Map(db.bikes.map((bike) => [bike.id, bike]));

    return {
      openQuotes: db.quotes.filter((quote) => quote.status === "Pendente").length,
      activeOrders: db.orders.filter((order) => order.status === "Em andamento").length,
      getCustomerName: (customerId) => customerMap.get(customerId)?.nomeRazaoSocial || "Cliente não encontrado",
      getBikeName: (bikeId) => {
        const bike = bikeMap.get(bikeId);
        return bike ? `${bike.marca ? `${bike.marca} ` : ""}${bike.modelo}${bike.placa ? ` · ${bike.placa}` : ""}` : "Moto não encontrada";
      }
    };
  }, [db]);

  function persist(updater, nextToast) {
    setDb((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      saveDatabase(next);
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

  function handleSaveQuote(form) {
    persist((current) => {
      if (form.id) {
        return {
          ...current,
          quotes: current.quotes.map((quote) =>
            quote.id === form.id
              ? {
                  ...quote,
                  ...form
                }
              : quote
          )
        };
      }

      return {
        ...current,
        quotes: [
          {
            id: createId("orc"),
            createdAt: new Date().toISOString().slice(0, 10),
            ...form
          },
          ...current.quotes
        ]
      };
    }, {
      type: "success",
      title: "Orçamento salvo",
      message: "O orçamento está pronto para aprovação do cliente."
    });
  }

  function handleQuoteStatusChange(id, status) {
    persist((current) => ({
      ...current,
      quotes: current.quotes.map((quote) => (quote.id === id ? { ...quote, status } : quote))
    }), {
      type: "success",
      title: "Status atualizado",
      message: "O orçamento foi atualizado."
    });
  }

  function handleDeleteQuote(id) {
    if (!window.confirm("Excluir este orçamento?")) {
      return;
    }

    persist((current) => ({
      ...current,
      quotes: current.quotes.filter((quote) => quote.id !== id)
    }), {
      type: "warning",
      title: "Orçamento excluído",
      message: "O registro foi removido da listagem."
    });
  }

  function handleCreateOrderDraft(quote) {
    setOrderDraft({
      customerId: quote.customerId,
      bikeId: quote.bikeId,
      service: quote.serviceDescription,
      partsUsed: quote.parts,
      total: quote.total,
      sourceQuoteId: quote.id,
      dueDate: ""
    });

    setToast({
      type: "success",
      title: "OS pronta para criação",
      message: "Os dados do orçamento foram carregados na ordem de serviço."
    });
    navigate("/ordens-servico");
  }

  function handleSaveOrder(form) {
    persist((current) => {
      if (form.id) {
        return {
          ...current,
          orders: current.orders.map((order) =>
            order.id === form.id ? buildOrderStatus({ ...order, ...form }, form.status) : order
          )
        };
      }

      const draftAwareOrder = buildOrderStatus(
        {
          id: createId("os"),
          createdAt: new Date().toISOString().slice(0, 10),
          ...form
        },
        form.status
      );

      return {
        ...current,
        orders: [draftAwareOrder, ...current.orders]
      };
    }, {
      type: "success",
      title: "OS salva",
      message: "A ordem de serviço foi registrada com sucesso."
    });
  }

  function handleOrderStatusChange(id, status) {
    persist((current) => ({
      ...current,
      orders: current.orders.map((order) =>
        order.id === id ? buildOrderStatus(order, status) : order
      )
    }), {
      type: "success",
      title: "OS atualizada",
      message: "O status da ordem de serviço foi alterado."
    });
  }

  function handleDeleteOrder(id) {
    if (!window.confirm("Excluir esta ordem de serviço?")) {
      return;
    }

    persist((current) => ({
      ...current,
      orders: current.orders.filter((order) => order.id !== id)
    }), {
      type: "warning",
      title: "OS excluída",
      message: "A ordem foi removida do fluxo."
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

  function handleSaveSupplier(form) {
    persist((current) => ({
      ...current,
      suppliers: form.id
        ? current.suppliers.map((supplier) => supplier.id === form.id ? { ...supplier, ...form } : supplier)
        : [{ ...form, id: createId("for") }, ...current.suppliers]
    }), { type: "success", title: "Fornecedor salvo", message: "O contato comercial foi atualizado." });
  }

  function handleDeleteSupplier(supplier) {
    if (!window.confirm(`Excluir o fornecedor ${supplier.company}?`)) return;
    persist((current) => ({
      ...current,
      suppliers: current.suppliers.filter((item) => item.id !== supplier.id)
    }), { type: "warning", title: "Fornecedor removido", message: "As peças vinculadas foram mantidas." });
  }

  const meta = pageMeta[location.pathname] || pageMeta["/dashboard"];

  return (
    <div className="app-shell">
      <Sidebar items={navItems} />

      <main className="content-shell">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
        />

        <div className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            <Route
              path="/orcamentos"
              element={
                <QuotesPage
                  db={db}
                  insights={insights}
                  onSave={handleSaveQuote}
                  onDelete={handleDeleteQuote}
                  onStatusChange={handleQuoteStatusChange}
                  onCreateOrderDraft={handleCreateOrderDraft}
                />
              }
            />
            <Route
              path="/ordens-servico"
              element={
                <OrdersPage
                  db={db}
                  insights={insights}
                  draft={orderDraft}
                  onConsumeDraft={() => setOrderDraft(null)}
                  onSave={handleSaveOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleOrderStatusChange}
                />
              }
            />
            <Route
              path="/faturamento"
              element={
                <BillingPage
                  db={db}
                  insights={insights}
                  month={billingMonth}
                  onMonthChange={setBillingMonth}
                />
              }
            />
            <Route path="/fornecedores" element={<SuppliersPage db={db} onSave={handleSaveSupplier} onDelete={handleDeleteSupplier} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
