export const CUSTOMER_TYPES = [
  "CLIENTE_COMUM",
  "OFICINA",
  "MECANICO",
  "MOTOPECA",
  "REVENDEDOR"
];

export const CUSTOMER_TYPE_LABELS = {
  CLIENTE_COMUM: "Cliente comum",
  OFICINA: "Oficina",
  MECANICO: "Mecânico",
  MOTOPECA: "Motopeça",
  REVENDEDOR: "Revendedor / Parceiro"
};

export const PRICE_TYPES = ["VAREJO", "REVENDA"];
export const PRICE_TYPE_LABELS = {
  VAREJO: "Venda",
  REVENDA: "Revenda"
};
export const PAYMENT_METHODS = [
  "DINHEIRO",
  "PIX",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "OUTRO"
];
export const PAYMENT_METHOD_LABELS = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_DEBITO: "Cartão de débito",
  CARTAO_CREDITO: "Cartão de crédito",
  OUTRO: "Outro"
};
export const SALE_STATUSES = ["CONCLUIDA", "CANCELADA"];
export const SALE_STATUS_LABELS = {
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada"
};
export const STOCK_MOVEMENT_TYPES = [
  "ENTRADA",
  "SAIDA_VENDA",
  "AJUSTE_ENTRADA",
  "AJUSTE_SAIDA",
  "SAIDA_MANUAL",
  "CANCELAMENTO_VENDA"
];

export function getDefaultPriceType(customer) {
  const priceTypeByCustomerType = {
    CLIENTE_COMUM: "VAREJO",
    OFICINA: "REVENDA",
    MECANICO: "REVENDA",
    MOTOPECA: "REVENDA",
    REVENDEDOR: "REVENDA"
  };
  return priceTypeByCustomerType[customer?.tipoCliente] || "VAREJO";
}

export function getProductPrice(product, priceType) {
  return priceType === "REVENDA" ? product.precoRevenda : product.precoVarejo;
}
