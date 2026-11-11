import { formatCurrency, formatDateTime } from "../utils/formatters.js";
import { buildThermalPdf, downloadPdf } from "./textPdf.js";
import { companyHeader, documentFooter } from "./thermalDocument.js";

const MOVEMENT_LABELS = {
  ENTRADA_AVULSA: "Entrada avulsa",
  SAIDA_AVULSA: "Saída avulsa",
  VENDA_DINHEIRO: "Venda em dinheiro",
  DEVOLUCAO_VENDA_DINHEIRO: "Devolução em dinheiro"
};

function financialPair(label, value, options = {}) {
  return {
    type: "pair",
    left: label,
    right: formatCurrency(value),
    fontSize: options.highlight ? 8.4 : 7.3,
    boldLeft: Boolean(options.highlight),
    boldRight: true,
    gapAfter: options.gapAfter || 2
  };
}

function movementElements(movement) {
  return [
    {
      type: "pair",
      left: formatDateTime(movement.dataHora),
      right: formatCurrency(movement.valor),
      fontSize: 7.1,
      boldRight: true
    },
    {
      type: "text",
      text: `${MOVEMENT_LABELS[movement.tipo] || movement.tipo}: ${movement.descricao || "Sem descrição"}`,
      fontSize: 7,
      lineHeight: 8.8
    },
    { type: "text", text: `Operador: ${movement.operadorEmail}`, fontSize: 6.7, gapAfter: 3 },
    { type: "rule", style: "dotted", gapAfter: 4 }
  ];
}

export function buildCashClosingPdf(cash, company) {
  const elements = [
    ...companyHeader(`RELATÓRIO DE CAIXA #${cash.id}`, company),
    { type: "pair", left: "Status", right: cash.status === "FECHADO" ? "Fechado" : "Aberto", fontSize: 7.3, boldLeft: true, boldRight: true },
    { type: "text", text: `Abertura: ${formatDateTime(cash.dataAbertura)}`, fontSize: 7.1 },
    { type: "text", text: `Operador: ${cash.operadorAberturaEmail}`, fontSize: 7.1 },
    { type: "text", text: `Fechamento: ${formatDateTime(cash.dataFechamento, "Caixa ainda aberto")}`, fontSize: 7.1 },
    { type: "text", text: `Operador: ${cash.operadorFechamentoEmail || "Caixa ainda aberto"}`, fontSize: 7.1, gapAfter: 5 },
    { type: "rule", style: "dashed", gapAfter: 5 },
    { type: "text", text: "RESUMO FINANCEIRO", align: "center", bold: true, fontSize: 8.5, gapAfter: 5 },
    financialPair("Valor inicial", cash.valorInicial),
    financialPair("Dinheiro", cash.totalDinheiro),
    financialPair("PIX", cash.totalPix),
    financialPair("Cartão de débito", cash.totalCartaoDebito),
    financialPair("Cartão de crédito", cash.totalCartaoCredito),
    financialPair("Outros", cash.totalOutro),
    financialPair("Total bruto recebido", cash.totalRecebido, { highlight: true }),
    financialPair("Estornos/devoluções", cash.totalEstornos),
    financialPair("Total líquido recebido", cash.totalRecebidoLiquido, { highlight: true }),
    financialPair("Entradas avulsas", cash.totalEntradasAvulsas),
    financialPair("Saídas avulsas", cash.totalSaidasAvulsas),
    financialPair("Saldo físico esperado", cash.saldoEsperado, { highlight: true }),
    financialPair("Valor contado", cash.valorContado),
    financialPair("Diferença", cash.diferenca, { highlight: true, gapAfter: 5 }),
    { type: "rule", style: "dashed", gapAfter: 5 },
    { type: "text", text: "MOVIMENTAÇÕES", align: "center", bold: true, fontSize: 8.5, gapAfter: 5 },
    ...(cash.movimentacoes || []).flatMap(movementElements),
    ...documentFooter(`*** FECHAMENTO DE CAIXA #${cash.id} ***`)
  ];
  return buildThermalPdf(elements, { paperWidth: 226.77, margin: 10, bottomMargin: 9 });
}

export function saveCashClosingPdf(cash) {
  downloadPdf(buildCashClosingPdf(cash), `fechamento-caixa-${cash.id}.pdf`);
}
