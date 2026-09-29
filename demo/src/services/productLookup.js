export const PRODUCT_LOOKUP_STATUS = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  FOUND_LOCAL: "FOUND_LOCAL",
  FOUND_EXTERNAL: "FOUND_EXTERNAL",
  NOT_FOUND: "NOT_FOUND",
  ERROR: "ERROR"
};

export const MOCK_PRODUCT_CODES = {
  FOUND: "7891234567895",
  ERROR: "0000000000000"
};

const mockProducts = {
  [MOCK_PRODUCT_CODES.FOUND]: {
    nome: "Óleo para Motor 10W40 1L",
    marca: "MotoMax",
    categoria: "Lubrificantes",
    descricao: "Óleo semissintético para motocicletas de quatro tempos.",
    imagemUrl: null
  },
  "7899876543216": {
    nome: "Pastilha de Freio Dianteira",
    marca: "StopMoto",
    categoria: "Freios",
    descricao: "Pastilha de freio para aplicações urbanas.",
    imagemUrl: null
  }
};

export function normalizeBarcode(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
}

export function isValidGtin(value) {
  const barcode = normalizeBarcode(value);
  if (!/^\d+$/.test(barcode) || ![8, 12, 13, 14].includes(barcode.length)) {
    return false;
  }

  const digits = barcode.split("").map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function hasDuplicateBarcode(products, barcode, currentProductId = "") {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return false;
  return products.some(
    (product) => product.id !== currentProductId
      && normalizeBarcode(product.codigoBarras) === normalized
  );
}

export async function lookupProviderMock(barcode) {
  const normalized = normalizeBarcode(barcode);
  if (normalized === MOCK_PRODUCT_CODES.ERROR) {
    throw new Error("Serviço de consulta temporariamente indisponível.");
  }

  const product = mockProducts[normalized];
  if (!product) {
    return { found: false, barcode: normalized, source: "MOCK" };
  }

  return {
    found: true,
    barcode: normalized,
    nome: product.nome,
    marca: product.marca,
    categoria: product.categoria,
    descricao: product.descricao,
    imagemUrl: product.imagemUrl,
    source: "MOCK"
  };
}

function normalizeProviderResult(result, barcode) {
  if (!result?.found) {
    return {
      status: PRODUCT_LOOKUP_STATUS.NOT_FOUND,
      found: false,
      barcode,
      source: result?.source || null
    };
  }

  return {
    status: PRODUCT_LOOKUP_STATUS.FOUND_EXTERNAL,
    found: true,
    barcode,
    nome: result.nome || null,
    marca: result.marca || null,
    categoria: result.categoria || null,
    descricao: result.descricao || null,
    aplicacao: result.aplicacao || null,
    imagemUrl: result.imagemUrl || null,
    source: result.source || null
  };
}

export async function lookupProductByBarcode(
  barcode,
  { products = [], findProduct, findLookup, provider = null } = {}
) {
  const normalized = normalizeBarcode(barcode);
  let localProduct;

  try {
    if (findLookup) {
      const response = await findLookup(normalized);
      if (response?.cadastradoLocalmente && response.produto) {
        return {
          status: PRODUCT_LOOKUP_STATUS.FOUND_LOCAL,
          found: true,
          barcode: normalized,
          product: response.produto,
          source: response.origem || "LOCAL"
        };
      }
      if (response?.encontrado && response.sugestao) {
        return normalizeProviderResult({
          found: true,
          source: response.origem,
          ...response.sugestao
        }, normalized);
      }
      if (response?.origem === "EXTERNO_INDISPONIVEL") {
        return {
          status: PRODUCT_LOOKUP_STATUS.ERROR,
          found: false,
          barcode: normalized,
          source: response.origem,
          message: response.mensagem || "Consulta externa temporariamente indisponível."
        };
      }
      return { status: PRODUCT_LOOKUP_STATUS.NOT_FOUND, found: false, barcode: normalized, source: response?.origem || null };
    }
    localProduct = findProduct
      ? await findProduct(normalized)
      : products.find(
          (product) => normalizeBarcode(product.codigoBarras) === normalized && normalized
        );
  } catch (error) {
    return {
      status: PRODUCT_LOOKUP_STATUS.ERROR,
      found: false,
      barcode: normalized,
      source: null,
      message: error instanceof Error ? error.message : "Não foi possível consultar os produtos da Saraiva Motos."
    };
  }

  if (localProduct) {
    return {
      status: PRODUCT_LOOKUP_STATUS.FOUND_LOCAL,
      found: true,
      barcode: normalized,
      product: localProduct,
      source: findProduct ? "SARAIVA_API" : "LOCAL"
    };
  }

  if (!provider) {
    return { status: PRODUCT_LOOKUP_STATUS.NOT_FOUND, found: false, barcode: normalized, source: null };
  }

  try {
    const result = await provider(normalized);
    return normalizeProviderResult(result, normalized);
  } catch (error) {
    return {
      status: PRODUCT_LOOKUP_STATUS.ERROR,
      found: false,
      barcode: normalized,
      source: null,
      message: error instanceof Error ? error.message : "Não foi possível consultar o serviço."
    };
  }
}

export function applyLookupToProductForm(form, lookup) {
  return {
    ...form,
    codigoBarras: normalizeBarcode(lookup.barcode),
    nome: lookup.nome || form.nome,
    marca: lookup.marca || form.marca,
    categoria: lookup.categoria || form.categoria,
    aplicacao: lookup.aplicacao || form.aplicacao,
    observacoes: lookup.descricao || form.observacoes
  };
}

export function interpretSalesLookupResponse(response, code) {
  if (response?.cadastradoLocalmente && response.produto) {
    return { ok: true, product: response.produto };
  }
  if (response?.encontrado && response.sugestao) {
    return {
      ok: false,
      code,
      message: "Produto encontrado em fonte externa. Cadastre e confirme os dados antes da venda."
    };
  }
  return {
    ok: false,
    code,
    message: response?.mensagem || "Produto não encontrado. Você pode cadastrá-lo manualmente."
  };
}

// Providers que exigem token ou client_secret devem ser chamados pelo backend.
// Segredos de GS1 ou de qualquer outro serviço nunca devem ser expostos no Vite/frontend.
