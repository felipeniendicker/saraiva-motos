function buildMonthDate(dayOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

export function createSeedDatabase() {
  const dataCadastro = buildMonthDate(-90);
  const customers = [
    { id: "cli-1", nomeRazaoSocial: "Rafael Martins", telefone: "(11) 99876-1122", cpfCnpj: "", tipoCliente: "CLIENTE_COMUM", endereco: "", observacoes: "Cliente recorrente; trabalha com entregas.", ativo: true, dataCadastro },
    { id: "cli-2", nomeRazaoSocial: "Juliana Costa", telefone: "(11) 98765-3344", cpfCnpj: "", tipoCliente: "CLIENTE_COMUM", endereco: "", observacoes: "Prefere aprovar serviços por WhatsApp.", ativo: true, dataCadastro },
    { id: "cli-3", nomeRazaoSocial: "Carlos Henrique", telefone: "(11) 97654-5566", cpfCnpj: "", tipoCliente: "MECANICO", endereco: "", observacoes: "Utiliza a moto diariamente.", ativo: true, dataCadastro },
    { id: "cli-4", nomeRazaoSocial: "Mariana Alves", telefone: "(11) 96543-7788", cpfCnpj: "", tipoCliente: "CLIENTE_COMUM", endereco: "", observacoes: "Cliente indicada por parceiro.", ativo: true, dataCadastro }
  ];

  const bikes = [
    { id: "moto-1", clienteId: "cli-1", marca: "Honda", modelo: "CG 160 Titan", ano: "2022", cilindrada: "160", placa: "FTR-9A21", observacoes: "Revisão preventiva a cada 4 mil km." },
    { id: "moto-2", clienteId: "cli-2", marca: "Yamaha", modelo: "Fazer 250", ano: "2021", cilindrada: "250", placa: "QPL-7C18", observacoes: "Ruído na suspensão dianteira." },
    { id: "moto-3", clienteId: "cli-3", marca: "Honda", modelo: "Biz 125", ano: "2020", cilindrada: "125", placa: "RZT-4D09", observacoes: "Troca recente de bateria." },
    { id: "moto-4", clienteId: "cli-4", marca: "Honda", modelo: "Pop 110i", ano: "2023", cilindrada: "110", placa: "", observacoes: "Placa não informada." }
  ];

  const suppliers = [
    { id: "for-1", name: "Eduardo Lima", phone: "(11) 4002-8922", company: "Moto Distribuidora Brasil", notes: "Entrega semanal de peças Honda e Yamaha." },
    { id: "for-2", name: "Fernanda Souza", phone: "(11) 3333-1840", company: "Rota Duas Rodas", notes: "Pneus, relação e itens de freio." },
    { id: "for-3", name: "André Ribeiro", phone: "(11) 98888-4210", company: "LubriMoto Atacado", notes: "Óleos, filtros e produtos de manutenção." }
  ];

  const products = [
    { id: "pec-1", nome: "Óleo Motul 10W40", codigoReferencia: "OL-MOT-1040", codigoBarras: "", marca: "Motul", categoria: "Lubrificantes", aplicacao: "Motos 4 tempos", valorCusto: 36, precoVarejo: 54.9, precoRevenda: 49.9, quantidadeEstoque: 18, estoqueMinimo: 8, observacoes: "Frasco de 1 litro.", ativo: true, dataCadastro },
    { id: "pec-2", nome: "Kit Relação CG 160", codigoReferencia: "KR-CG160", codigoBarras: "", marca: "Riffel", categoria: "Transmissão", aplicacao: "Honda CG 160 2016+", valorCusto: 118, precoVarejo: 179.9, precoRevenda: 164.9, quantidadeEstoque: 3, estoqueMinimo: 5, observacoes: "Coroa, pinhão e corrente.", ativo: true, dataCadastro },
    { id: "pec-3", nome: "Pastilha de Freio CG 160", codigoReferencia: "PF-CG160", codigoBarras: "", marca: "Cobreq", categoria: "Freios", aplicacao: "Honda CG 160", valorCusto: 28, precoVarejo: 49.9, precoRevenda: 44.9, quantidadeEstoque: 4, estoqueMinimo: 6, observacoes: "Jogo dianteiro.", ativo: true, dataCadastro },
    { id: "pec-4", nome: "Cabo de Embreagem Titan", codigoReferencia: "CE-TITAN", codigoBarras: "", marca: "Soretto", categoria: "Cabos", aplicacao: "CG Titan 150/160", valorCusto: 22, precoVarejo: 39.9, precoRevenda: 35.9, quantidadeEstoque: 9, estoqueMinimo: 4, observacoes: "Conferir ano antes da venda.", ativo: true, dataCadastro },
    { id: "pec-5", nome: "Pneu 90/90-18", codigoReferencia: "PN-909018", codigoBarras: "", marca: "Levorin", categoria: "Pneus", aplicacao: "Roda traseira CG/Fan", valorCusto: 238, precoVarejo: 319.9, precoRevenda: 299.9, quantidadeEstoque: 2, estoqueMinimo: 3, observacoes: "Uso urbano.", ativo: true, dataCadastro },
    { id: "pec-6", nome: "Filtro de Óleo", codigoReferencia: "FO-001", codigoBarras: "", marca: "Tecfil", categoria: "Filtros", aplicacao: "Fazer 250 / Lander 250", valorCusto: 16.5, precoVarejo: 29.9, precoRevenda: 26.9, quantidadeEstoque: 12, estoqueMinimo: 5, observacoes: "Modelo PSL638.", ativo: true, dataCadastro },
    { id: "pec-7", nome: "Vela NGK", codigoReferencia: "VL-NGK-DR8", codigoBarras: "", marca: "NGK", categoria: "Ignição", aplicacao: "CG 125/150/160", valorCusto: 14, precoVarejo: 24.9, precoRevenda: 21.9, quantidadeEstoque: 15, estoqueMinimo: 6, observacoes: "Referência DR8EA.", ativo: true, dataCadastro }
  ];

  const stockMovements = [
    { id: "mov-1", produtoId: "pec-1", tipo: "ENTRADA", quantidade: 12, estoqueAnterior: 6, estoquePosterior: 18, motivo: "Compra da LubriMoto Atacado", vendaId: null, dataHora: `${buildMonthDate(-1)}T09:00:00` },
    { id: "mov-2", produtoId: "pec-2", tipo: "AJUSTE_SAIDA", quantidade: 1, estoqueAnterior: 4, estoquePosterior: 3, motivo: "Utilizado na OS #os-3", vendaId: null, dataHora: `${buildMonthDate(-2)}T10:30:00` },
    { id: "mov-3", produtoId: "pec-3", tipo: "SAIDA_VENDA", quantidade: 2, estoqueAnterior: 6, estoquePosterior: 4, motivo: "Venda no balcão", vendaId: null, dataHora: `${buildMonthDate(-3)}T14:00:00` },
    { id: "mov-4", produtoId: "pec-5", tipo: "ENTRADA", quantidade: 2, estoqueAnterior: 0, estoquePosterior: 2, motivo: "Reposição de estoque", vendaId: null, dataHora: `${buildMonthDate(-4)}T11:00:00` },
    { id: "mov-5", produtoId: "pec-7", tipo: "AJUSTE_SAIDA", quantidade: 1, estoqueAnterior: 16, estoquePosterior: 15, motivo: "Aplicação em revisão", vendaId: null, dataHora: `${buildMonthDate(-5)}T16:00:00` }
  ];

  const quotes = [
    { id: "orc-1", customerId: "cli-2", bikeId: "moto-2", serviceDescription: "Troca do kit relação e revisão da suspensão.", items: [{ productId: "pec-2", quantity: 1, unitPrice: 179.9 }], parts: "Kit Relação CG 160", partsValue: 179.9, laborValue: 180, total: 359.9, status: "Pendente", createdAt: buildMonthDate(-5) },
    { id: "orc-2", customerId: "cli-3", bikeId: "moto-3", serviceDescription: "Revisão do sistema de partida e troca de vela.", items: [{ productId: "pec-7", quantity: 1, unitPrice: 24.9 }], parts: "Vela NGK", partsValue: 24.9, laborValue: 140, total: 164.9, status: "Aprovado", createdAt: buildMonthDate(-8) },
    { id: "orc-3", customerId: "cli-4", bikeId: "moto-4", serviceDescription: "Troca de óleo e inspeção geral.", items: [{ productId: "pec-1", quantity: 1, unitPrice: 54.9 }], parts: "Óleo Motul 10W40", partsValue: 54.9, laborValue: 60, total: 114.9, status: "Recusado", createdAt: buildMonthDate(-10) }
  ];

  const orders = [
    { id: "os-1", customerId: "cli-1", bikeId: "moto-1", sourceQuoteId: null, service: "Revisão geral com troca de óleo e filtros.", partsUsed: "Óleo Motul 10W40, Vela NGK", mechanic: "Marcos Silva", entryDate: buildMonthDate(-6), dueDate: buildMonthDate(-2), status: "Finalizado", total: 480, createdAt: buildMonthDate(-6), completedAt: buildMonthDate(-2) },
    { id: "os-2", customerId: "cli-2", bikeId: "moto-2", sourceQuoteId: null, service: "Diagnóstico elétrico e troca de lâmpadas.", partsUsed: "Lâmpada do farol", mechanic: "Paulo Menezes", entryDate: buildMonthDate(-1), dueDate: buildMonthDate(2), status: "Em andamento", total: 230, createdAt: buildMonthDate(-1), completedAt: null },
    { id: "os-3", customerId: "cli-3", bikeId: "moto-3", sourceQuoteId: "orc-2", service: "Revisão do sistema de partida e troca de vela.", partsUsed: "Vela NGK", mechanic: "Aline Rocha", entryDate: buildMonthDate(-3), dueDate: buildMonthDate(1), status: "Aguardando", total: 164.9, createdAt: buildMonthDate(-3), completedAt: null }
  ];

  const sales = [];

  return { customers, bikes, suppliers, products, stockMovements, sales, quotes, orders, meta: { seededAt: new Date().toISOString(), version: 5, nextSaleNumber: 1 } };
}
