export const DEFAULT_COMPANY_SETTINGS = Object.freeze({
  nomeFantasia: "SARAIVA MOTOS",
  razaoSocial: "SARAIVA MOTO PEÇAS",
  cnpj: "",
  telefone: "",
  endereco: "",
  email: ""
});

let currentCompanySettings = DEFAULT_COMPANY_SETTINGS;

export function normalizeCompanySettings(settings = {}) {
  return {
    nomeFantasia: String(settings.nomeFantasia || DEFAULT_COMPANY_SETTINGS.nomeFantasia).trim(),
    razaoSocial: String(settings.razaoSocial || DEFAULT_COMPANY_SETTINGS.razaoSocial).trim(),
    cnpj: String(settings.cnpj || "").trim(),
    telefone: String(settings.telefone || "").trim(),
    endereco: String(settings.endereco || "").trim(),
    email: String(settings.email || "").trim()
  };
}

export function setCurrentCompanySettings(settings) {
  currentCompanySettings = Object.freeze(normalizeCompanySettings(settings));
  return currentCompanySettings;
}

export function getCurrentCompanySettings() {
  return currentCompanySettings;
}

export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function cnpjCheckDigit(digits, length) {
  const weights = length === 12
    ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value) {
  if (!String(value || "").trim()) return true;
  if (!/^[0-9./\-\s]+$/.test(String(value))) return false;
  const digits = onlyDigits(value);
  return digits.length === 14
    && !/^(\d)\1{13}$/.test(digits)
    && cnpjCheckDigit(digits, 12) === Number(digits[12])
    && cnpjCheckDigit(digits, 13) === Number(digits[13]);
}

export function isValidPhone(value) {
  if (!String(value || "").trim()) return true;
  if (!/^[0-9()+\-\s]+$/.test(String(value))) return false;
  return [10, 11].includes(onlyDigits(value).length);
}

export function isValidEmail(value) {
  if (!String(value || "").trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function validateCompanySettings(settings) {
  if (!String(settings.nomeFantasia || "").trim()) return "Informe o nome fantasia.";
  if (!String(settings.razaoSocial || "").trim()) return "Informe a razão social.";
  if (!isValidCnpj(settings.cnpj)) return "Informe um CNPJ válido.";
  if (!isValidPhone(settings.telefone)) return "Informe um telefone com DDD e 10 ou 11 dígitos.";
  if (!isValidEmail(settings.email)) return "Informe um e-mail válido.";
  return "";
}

export function formatCnpjInput(value) {
  return onlyDigits(value).slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatPhoneInput(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
