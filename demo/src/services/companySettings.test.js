import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_COMPANY_SETTINGS,
  formatCnpjInput,
  formatPhoneInput,
  isValidCnpj,
  isValidEmail,
  isValidPhone,
  normalizeCompanySettings,
  validateCompanySettings
} from "./companySettings.js";

test("preserva os nomes atuais como configuração inicial", () => {
  assert.equal(DEFAULT_COMPANY_SETTINGS.nomeFantasia, "SARAIVA MOTOS");
  assert.equal(DEFAULT_COMPANY_SETTINGS.razaoSocial, "SARAIVA MOTO PEÇAS");
  assert.deepEqual(normalizeCompanySettings({}), DEFAULT_COMPANY_SETTINGS);
});

test("valida CNPJ pelos dois dígitos verificadores", () => {
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("11.222.333/0001-82"), false);
  assert.equal(isValidCnpj("00.000.000/0000-00"), false);
  assert.equal(formatCnpjInput("11222333000181"), "11.222.333/0001-81");
});

test("valida e formata telefone com DDD sem exigir campo opcional", () => {
  assert.equal(isValidPhone(""), true);
  assert.equal(isValidPhone("(11) 99999-9999"), true);
  assert.equal(isValidPhone("9999-9999"), false);
  assert.equal(formatPhoneInput("11999999999"), "(11) 99999-9999");
});

test("valida e-mail e campos obrigatórios", () => {
  assert.equal(isValidEmail("contato@saraiva.com.br"), true);
  assert.equal(isValidEmail("email-invalido"), false);
  assert.match(validateCompanySettings({ nomeFantasia: "", razaoSocial: "Saraiva" }), /nome fantasia/i);
  assert.equal(validateCompanySettings({
    nomeFantasia: "Saraiva", razaoSocial: "Saraiva Ltda", cnpj: "", telefone: "", email: ""
  }), "");
});
