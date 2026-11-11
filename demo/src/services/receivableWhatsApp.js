import { formatCurrency } from "../utils/formatters.js";
import { getCurrentCompanySettings } from "./companySettings.js";
import { downloadPdf } from "./textPdf.js";

function companyName(company) {
  return company?.nomeFantasia || "SARAIVA MOTOS";
}

export function buildReceivableWhatsAppMessage(account, company = getCurrentCompanySettings()) {
  return [
    companyName(company),
    `Extrato atualizado de ${account.clienteNome || "cliente não informado"}.`,
    `Referência: ${account.numeroVenda || account.vendaId || account.id || "não informada"}.`,
    `Valor original: ${formatCurrency(account.valorOriginal)}.`,
    `Total recebido: ${formatCurrency(account.valorRecebido)}.`,
    `Saldo pendente: ${formatCurrency(account.saldoPendente)}.`,
    "O PDF anexo contém o histórico atualizado da conta."
  ].join("\n");
}

export function buildConsolidatedWhatsAppMessage(group, company = getCurrentCompanySettings()) {
  return [
    companyName(company),
    `Extrato consolidado de ${group.clienteNome || "cliente não informado"}.`,
    `Referência: cliente ${group.clienteId ?? group.key ?? "não informado"}.`,
    `Total original: ${formatCurrency(group.valorOriginalTotal)}.`,
    `Total recebido: ${formatCurrency(group.totalRecebido)}.`,
    `Saldo pendente: ${formatCurrency(group.saldoTotal)}.`,
    "O PDF anexo contém os títulos e pagamentos atualizados."
  ].join("\n");
}

function whatsappUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function shareReceivablePdf(
  { bytes, filename, message, title = "Extrato atualizado" },
  {
    navigatorObject = globalThis.navigator,
    windowObject = globalThis.window,
    FileClass = globalThis.File,
    download = downloadPdf
  } = {}
) {
  if (navigatorObject?.share && navigatorObject?.canShare && FileClass) {
    const file = new FileClass([bytes], filename, { type: "application/pdf" });
    if (navigatorObject.canShare({ files: [file] })) {
      try {
        await navigatorObject.share({ title, text: message, files: [file] });
        return "shared";
      } catch (error) {
        if (error?.name === "AbortError") return "cancelled";
      }
    }
  }

  download(bytes, filename);
  windowObject?.open?.(whatsappUrl(message), "_blank", "noopener,noreferrer");
  return "downloaded";
}
