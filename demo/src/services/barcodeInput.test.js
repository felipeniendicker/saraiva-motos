import test from "node:test";
import assert from "node:assert/strict";
import { handleBarcodeKeyDown, submitBarcodeValue } from "./barcodeInput.js";

test("Enter executa busca e impede submit acidental", () => {
  let searched = "";
  let prevented = false;
  const handled = handleBarcodeKeyDown({ key: "Enter", preventDefault: () => { prevented = true; } }, " 000123 ", (code) => { searched = code; });
  assert.equal(handled, true);
  assert.equal(prevented, true);
  assert.equal(searched, "000123");
});

test("Enter vazio não executa busca", () => {
  let calls = 0;
  const handled = handleBarcodeKeyDown({ key: "Enter", preventDefault() {} }, "   ", () => { calls += 1; });
  assert.equal(handled, false);
  assert.equal(calls, 0);
});

test("outras teclas não executam nem bloqueiam o campo", () => {
  let calls = 0;
  assert.equal(handleBarcodeKeyDown({ key: "7", preventDefault() { throw new Error("não deve bloquear"); } }, "7", () => { calls += 1; }), false);
  assert.equal(calls, 0);
});

test("colagem e digitação mantêm código como string", () => {
  let value;
  submitBarcodeValue("00012345678905", (code) => { value = code; });
  assert.equal(value, "00012345678905");
  assert.equal(typeof value, "string");
});
