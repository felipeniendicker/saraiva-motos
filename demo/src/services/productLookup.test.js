import test from "node:test";
import assert from "node:assert/strict";
import {
  MOCK_PRODUCT_CODES,
  PRODUCT_LOOKUP_STATUS,
  applyLookupToProductForm,
  hasDuplicateBarcode,
  lookupProductByBarcode,
  lookupProviderMock,
  normalizeBarcode
} from "./productLookup.js";

const baseForm = {
  nome: "",
  codigoBarras: "",
  marca: "",
  categoria: "",
  observacoes: "",
  valorCusto: "0",
  precoVarejo: "0",
  precoRevenda: "0",
  quantidadeEstoque: "0",
  estoqueMinimo: "0"
};

test("46. normalização remove somente espaços acidentais", () => {
  assert.equal(normalizeBarcode("  789 123/456@789  "), "789123/456@789");
});

test("47. normalização preserva zeros à esquerda", () => {
  assert.equal(normalizeBarcode(" 00123456 "), "00123456");
});

test("48. produto local é encontrado antes do provider", async () => {
  const localProduct = { id: "p1", codigoBarras: "789123", nome: "Produto local" };
  const result = await lookupProductByBarcode("789123", {
    products: [localProduct],
    provider: async () => ({ found: true, nome: "Produto externo" })
  });
  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.FOUND_LOCAL);
  assert.equal(result.product, localProduct);
});

test("49. provider não é chamado quando produto já existe", async () => {
  let providerCalls = 0;
  await lookupProductByBarcode("789123", {
    products: [{ id: "p1", codigoBarras: "789123" }],
    provider: async () => {
      providerCalls += 1;
      return { found: false };
    }
  });
  assert.equal(providerCalls, 0);
});

test("50. produto externo encontrado retorna estrutura normalizada", async () => {
  const result = await lookupProductByBarcode("789123", {
    provider: async () => ({
      found: true,
      nome: "Peça externa",
      marca: "Marca X",
      categoria: "Freios",
      descricao: "Descrição",
      imagemUrl: undefined,
      source: "TEST",
      precoVarejo: 999
    })
  });
  assert.deepEqual(result, {
    status: PRODUCT_LOOKUP_STATUS.FOUND_EXTERNAL,
    found: true,
    barcode: "789123",
    nome: "Peça externa",
    marca: "Marca X",
    categoria: "Freios",
    descricao: "Descrição",
    imagemUrl: null,
    source: "TEST"
  });
});

test("51. produto não encontrado mantém cadastro manual disponível", async () => {
  const result = await lookupProductByBarcode("123456", {
    provider: async () => ({ found: false, source: "TEST" })
  });
  const form = applyLookupToProductForm(baseForm, result);
  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.NOT_FOUND);
  assert.equal(form.codigoBarras, "123456");
});

test("52. erro externo mantém cadastro manual disponível", async () => {
  const result = await lookupProductByBarcode("123456", {
    provider: async () => { throw new Error("Indisponível"); }
  });
  const form = applyLookupToProductForm(baseForm, result);
  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.ERROR);
  assert.equal(form.codigoBarras, "123456");
});

test("53. dados externos não preenchem preços ou estoque", async () => {
  const result = await lookupProductByBarcode("123456", {
    provider: async () => ({ found: true, nome: "Peça", precoVarejo: 500, quantidadeEstoque: 20 })
  });
  const internalForm = { ...baseForm, precoVarejo: "15", quantidadeEstoque: "3" };
  const form = applyLookupToProductForm(internalForm, result);
  assert.equal(form.precoVarejo, "15");
  assert.equal(form.quantidadeEstoque, "3");
});

test("54. código externo pré-preenche codigoBarras", async () => {
  const result = await lookupProductByBarcode("00123456", {
    provider: async () => ({ found: true, nome: "Peça" })
  });
  assert.equal(applyLookupToProductForm(baseForm, result).codigoBarras, "00123456");
});

test("55. código duplicado continua bloqueado", () => {
  const products = [{ id: "p1", codigoBarras: "00123456" }];
  assert.equal(hasDuplicateBarcode(products, "00 123 456"), true);
  assert.equal(hasDuplicateBarcode(products, "00123456", "p1"), false);
});

test("56. código é sempre tratado como string", () => {
  const normalized = normalizeBarcode(789123);
  assert.equal(typeof normalized, "string");
  assert.equal(normalized, "789123");
});

test("57. mock representa encontrado, não encontrado e erro", async () => {
  const found = await lookupProviderMock(MOCK_PRODUCT_CODES.FOUND);
  const notFound = await lookupProviderMock("1111111111111");
  await assert.rejects(() => lookupProviderMock(MOCK_PRODUCT_CODES.ERROR));
  assert.equal(found.found, true);
  assert.equal(notFound.found, false);
});

test("58. consulta da API da Saraiva ocorre antes do provider externo", async () => {
  let providerCalled = false;
  const result = await lookupProductByBarcode("00123456", {
    findProduct: async (code) => ({ id: 10, codigoBarras: code, nome: "Produto da API" }),
    provider: async () => {
      providerCalled = true;
      return { found: false };
    }
  });

  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.FOUND_LOCAL);
  assert.equal(result.source, "SARAIVA_API");
  assert.equal(providerCalled, false);
});

test("59. produto ausente na API permite consultar provider externo", async () => {
  const result = await lookupProductByBarcode("00123456", {
    findProduct: async () => null,
    provider: async () => ({ found: true, nome: "Produto externo", source: "TEST" })
  });

  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.FOUND_EXTERNAL);
  assert.equal(result.nome, "Produto externo");
});

test("modo de produção não usa provider mock por padrão", async () => {
  const result = await lookupProductByBarcode(MOCK_PRODUCT_CODES.FOUND);
  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.NOT_FOUND);
  assert.equal(result.found, false);
});

test("lookup estruturado retorna produto local inclusive inativo", async () => {
  const product = { id: 4, nome: "Peça inativa", ativo: false, codigoBarras: "000123" };
  const result = await lookupProductByBarcode("000123", {
    findLookup: async () => ({ encontrado: true, origem: "LOCAL", cadastradoLocalmente: true, produto: product })
  });
  assert.equal(result.status, PRODUCT_LOOKUP_STATUS.FOUND_LOCAL);
  assert.equal(result.product.ativo, false);
});
