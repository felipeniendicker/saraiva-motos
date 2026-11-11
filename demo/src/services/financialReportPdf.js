import { formatCurrency } from "../utils/formatters.js";
import { getCurrentCompanySettings } from "./companySettings.js";
import { buildTextPdf, downloadPdf } from "./textPdf.js";

export function saveFinancialReportPdf(report) {
  const company = getCurrentCompanySettings();
  const lines = [
    company.nomeFantasia,
    company.razaoSocial,
    `CNPJ: ${company.cnpj || "Não informado"}`,
    `Telefone: ${company.telefone || "Não informado"}`,
    `Endereço: ${company.endereco || "Não informado"}`,
    `E-mail: ${company.email || "Não informado"}`,
    "RELATORIO FINANCEIRO",
    `Periodo: ${report.dataInicio || "inicio"} a ${report.dataFim || "hoje"}`,
    "------------------------------------------",
    `Total vendido: ${formatCurrency(report.totalVendido)}`,
    `Total recebido: ${formatCurrency(report.totalRecebido)}`,
    `Dinheiro: ${formatCurrency(report.totalDinheiro)}`,
    `PIX: ${formatCurrency(report.totalPix)}`,
    `Debito: ${formatCurrency(report.totalCartaoDebito)}`,
    `Credito: ${formatCurrency(report.totalCartaoCredito)}`,
    `Outros: ${formatCurrency(report.totalOutro)}`,
    `Estornos: ${formatCurrency(report.totalEstornos)}`,
    `Recebido liquido: ${formatCurrency(report.totalRecebidoLiquido)}`,
    `Pendente atual: ${formatCurrency(report.totalPendente)}`,
    `Vencido atual: ${formatCurrency(report.totalVencido)}`
  ];
  downloadPdf(buildTextPdf(lines), "relatorio-financeiro.pdf");
}
