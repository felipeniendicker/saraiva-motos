import test from "node:test";
import assert from "node:assert/strict";
import { createBarcodeScanGate } from "./cameraBarcodeScanner.js";
import { lookupProductByBarcode, PRODUCT_LOOKUP_STATUS } from "./productLookup.js";
import { addProductToCart, findProductByCode } from "./sales.js";

const product = {
  id: 7,
  nome: "Pastilha de freio",
  codigoReferencia: "PF-01",
  codigoBarras: "7891234567890",
  precoVarejo: 50,
  precoRevenda: 40,
  quantidadeEstoque: 3,
  ativo: true
};

test("câmera de produtos reutiliza a consulta existente sem criar cadastro", async () => {
  let result;
  const gate = createBarcodeScanGate(async (code) => {
    result = await lookupProductByBarcode(code, { products: [product] });
  });

  await gate.accept(product.codigoBarras);

  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.FOUND_LOCAL);
  assert.equal(result.product.id, product.id);
});

test("câmera do PDV localiza e adiciona pelo fluxo comercial existente", async () => {
  let cart = [];
  const gate = createBarcodeScanGate(async (code) => {
    const lookup = findProductByCode([product], code);
    assert.equal(lookup.ok, true);
    const addition = addProductToCart(cart, lookup.product, "VAREJO", () => "item-camera");
    assert.equal(addition.ok, true);
    cart = addition.items;
  });

  await gate.accept(product.codigoBarras);

  assert.equal(cart.length, 1);
  assert.equal(cart[0].produtoId, product.id);
  assert.equal(cart[0].precoUnitario, 50);
});

test("câmera do PDV não cria produto quando o código não existe", async () => {
  let message = "";
  const gate = createBarcodeScanGate(async (code) => {
    const lookup = findProductByCode([product], code);
    message = lookup.message;
  });

  await gate.accept("0000000000000");

  assert.match(message, /Produto ativo não encontrado/);
});

test("câmera do estoque apenas seleciona o produto existente", async () => {
  let selectedId = null;
  const gate = createBarcodeScanGate(async (code) => {
    const lookup = findProductByCode([product], code);
    if (lookup.ok) selectedId = lookup.product.id;
  });

  await gate.accept(product.codigoBarras);

  assert.equal(selectedId, product.id);
  assert.equal(product.quantidadeEstoque, 3);
});
