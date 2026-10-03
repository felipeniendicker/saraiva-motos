import assert from "node:assert/strict";
import test from "node:test";
import { CUSTOMER_PROFILE_TABS, getNextCustomerProfileTab } from "./customerProfileTabs.js";

test("navega entre as abas do perfil com setas e retorno circular", () => {
  assert.equal(getNextCustomerProfileTab("dados", "ArrowRight"), "motos");
  assert.equal(getNextCustomerProfileTab("compras", "ArrowRight"), "dados");
  assert.equal(getNextCustomerProfileTab("dados", "ArrowLeft"), "compras");
});

test("leva o foco à primeira ou última aba com Home e End", () => {
  assert.equal(getNextCustomerProfileTab("motos", "Home"), CUSTOMER_PROFILE_TABS[0]);
  assert.equal(getNextCustomerProfileTab("motos", "End"), CUSTOMER_PROFILE_TABS.at(-1));
  assert.equal(getNextCustomerProfileTab("motos", "Tab"), "motos");
});
