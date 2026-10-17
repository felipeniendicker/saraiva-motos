import { formatCurrency, formatDateTime } from "../utils/formatters.js";
import { buildTextPdf, downloadPdf } from "./textPdf.js";

export function buildQuotePdf(quote){
  const lines=["SARAIVA MOTOS","ORCAMENTO","------------------------------------------",`Numero: ${quote.numero}`,
    `Emissao: ${formatDateTime(quote.dataEmissao)}`,`Validade: ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${quote.validade}T12:00:00`))}`,
    `Cliente: ${quote.clienteNome||"Consumidor nao identificado"}`,"------------------------------------------"];
  for(const item of quote.itens||[]){lines.push(`${item.quantidade}x ${item.descricaoItem}`,`${formatCurrency(item.precoUnitario)} = ${formatCurrency(item.subtotal)}`);}
  lines.push("------------------------------------------",`Subtotal: ${formatCurrency(quote.subtotal)}`,
    `Desconto: ${Number(quote.descontoPercentual).toLocaleString("pt-BR")}% (${formatCurrency(quote.desconto)})`,
    `TOTAL: ${formatCurrency(quote.total)}`);
  if(quote.observacoes)lines.push(`Observacoes: ${quote.observacoes}`);
  lines.push("------------------------------------------","Orcamento nao reserva estoque. Precos e disponibilidade serao validados na venda.");
  return buildTextPdf(lines,{paperWidth:226.77,minHeight:360,margin:10,fontSize:8,leading:10});
}
export function saveQuotePdf(quote){downloadPdf(buildQuotePdf(quote),`orcamento-${quote.numero}.pdf`);}
