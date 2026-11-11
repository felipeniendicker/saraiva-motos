import { getCurrentCompanySettings, normalizeCompanySettings } from "./companySettings.js";

function informed(value) {
  return value || "Não informado";
}

export function companyHeader(documentName, company = getCurrentCompanySettings()) {
  const settings = normalizeCompanySettings(company);
  return [
    { type: "text", text: settings.nomeFantasia, align: "center", bold: true, fontSize: 13, lineHeight: 15 },
    { type: "text", text: settings.razaoSocial, align: "center", bold: true, fontSize: 8, gapAfter: 2 },
    { type: "text", text: `CNPJ: ${informed(settings.cnpj)}`, align: "center", fontSize: 6.8 },
    { type: "text", text: `Telefone: ${informed(settings.telefone)}`, align: "center", fontSize: 6.8 },
    { type: "text", text: `Endereço: ${informed(settings.endereco)}`, align: "center", fontSize: 6.8 },
    { type: "text", text: `E-mail: ${informed(settings.email)}`, align: "center", fontSize: 6.8, gapAfter: 4 },
    { type: "rule", style: "solid", gapAfter: 6 },
    { type: "text", text: documentName, align: "center", bold: true, fontSize: 12, lineHeight: 14, gapAfter: 5 },
    { type: "rule", style: "solid", gapAfter: 6 }
  ];
}

export function documentFooter(documentId, observation, notice) {
  const elements = [{ type: "rule", style: "dashed", gapBefore: 3, gapAfter: 6 }];
  if (observation) {
    elements.push(
      { type: "text", text: "OBSERVAÇÕES", bold: true, fontSize: 7.5 },
      { type: "text", text: observation, fontSize: 7.2, lineHeight: 9, gapAfter: 5 }
    );
  }
  if (notice) elements.push({ type: "text", text: notice, align: "center", fontSize: 7, lineHeight: 9, gapAfter: 5 });
  elements.push(
    { type: "text", text: "Obrigado pela preferência!", align: "center", bold: true, fontSize: 8.5, gapAfter: 3 },
    { type: "text", text: documentId, align: "center", bold: true, fontSize: 7 }
  );
  return elements;
}
