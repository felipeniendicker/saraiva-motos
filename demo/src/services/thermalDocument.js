const environment = import.meta.env || {};

export const COMPANY_INFO = Object.freeze({
  brand: "SARAIVA MOTOS",
  legalName: "SARAIVA MOTO PEÇAS",
  cnpj: environment.VITE_COMPANY_CNPJ || "Não informado",
  phone: environment.VITE_COMPANY_PHONE || "Não informado",
  address: environment.VITE_COMPANY_ADDRESS || "Não informado",
  email: environment.VITE_COMPANY_EMAIL || "Não informado"
});

export function companyHeader(documentName, company = COMPANY_INFO) {
  return [
    { type: "text", text: company.brand, align: "center", bold: true, fontSize: 13, lineHeight: 15 },
    { type: "text", text: company.legalName, align: "center", bold: true, fontSize: 8, gapAfter: 2 },
    { type: "text", text: `CNPJ: ${company.cnpj}`, align: "center", fontSize: 6.8 },
    { type: "text", text: `Telefone: ${company.phone}`, align: "center", fontSize: 6.8 },
    { type: "text", text: `Endereço: ${company.address}`, align: "center", fontSize: 6.8 },
    { type: "text", text: `E-mail: ${company.email}`, align: "center", fontSize: 6.8, gapAfter: 4 },
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
