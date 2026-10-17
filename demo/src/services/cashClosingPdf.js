import { formatCurrency, formatDateTime } from "../utils/formatters.js";
import { buildTextPdf, downloadPdf } from "./textPdf.js";

const MOVEMENT_LABELS = {
  ENTRADA_AVULSA: "Entrada avulsa",
  SAIDA_AVULSA: "Saída avulsa",
  VENDA_DINHEIRO: "Venda em dinheiro",
  DEVOLUCAO_VENDA_DINHEIRO: "Devolução em dinheiro"
};

export function buildCashClosingPdf(cash) {
  const lines = [
    "SARAIVA MOTOS",
    `RELATORIO DE CAIXA #${cash.id}`,
    "------------------------------------------------------------",
    `Status: ${cash.status === "FECHADO" ? "Fechado" : "Aberto"}`,
    `Abertura: ${formatDateTime(cash.dataAbertura)}`,
    `Operador de abertura: ${cash.operadorAberturaEmail}`,
    `Fechamento: ${formatDateTime(cash.dataFechamento, "Caixa ainda aberto")}`,
    `Operador de fechamento: ${cash.operadorFechamentoEmail || "Caixa ainda aberto"}`,
    "------------------------------------------------------------",
    `Valor inicial: ${formatCurrency(cash.valorInicial)}`,
    `Dinheiro: ${formatCurrency(cash.totalDinheiro)}`,
    `PIX: ${formatCurrency(cash.totalPix)}`,
    `Cartao de debito: ${formatCurrency(cash.totalCartaoDebito)}`,
    `Cartao de credito: ${formatCurrency(cash.totalCartaoCredito)}`,
    `Outros: ${formatCurrency(cash.totalOutro)}`,
    `Total bruto recebido: ${formatCurrency(cash.totalRecebido)}`,
    `Estornos/devolucoes: ${formatCurrency(cash.totalEstornos)}`,
    `Total liquido recebido: ${formatCurrency(cash.totalRecebidoLiquido)}`,
    `Entradas avulsas: ${formatCurrency(cash.totalEntradasAvulsas)}`,
    `Saidas avulsas: ${formatCurrency(cash.totalSaidasAvulsas)}`,
    `Saldo fisico esperado: ${formatCurrency(cash.saldoEsperado)}`,
    `Valor contado: ${formatCurrency(cash.valorContado)}`,
    `Diferenca: ${formatCurrency(cash.diferenca)}`,
    "------------------------------------------------------------",
    "MOVIMENTACOES"
  ];
  for (const movement of cash.movimentacoes || []) {
    lines.push(`${formatDateTime(movement.dataHora)} | ${MOVEMENT_LABELS[movement.tipo] || movement.tipo} | ${formatCurrency(movement.valor)}`);
    lines.push(`  ${movement.descricao} | ${movement.operadorEmail}`);
  }
  return buildTextPdf(lines);
}

export function saveCashClosingPdf(cash) {
  downloadPdf(buildCashClosingPdf(cash), `fechamento-caixa-${cash.id}.pdf`);
}
