import test from "node:test";
import assert from "node:assert/strict";
import { buildThermalPdf, wrapPdfText } from "./textPdf.js";

test("quebra palavras longas para não ultrapassar a largura útil", () => {
  const lines = wrapPdfText("DESCRICAOEXTREMAMENTELONGASEMESPACOS123456789", 55, 8, false);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(""), "DESCRICAOEXTREMAMENTELONGASEMESPACOS123456789");
});

test("PDF térmico calcula altura pelo conteúdo e desenha apenas preto sobre branco", () => {
  const shortPdf = new TextDecoder("latin1").decode(buildThermalPdf([
    { type: "text", text: "Linha curta" }
  ]));
  const longElements = Array.from(
    { length: 20 },
    (_, index) => ({ type: "text", text: `Linha ${index + 1}` })
  );
  longElements.push({ type: "rule", style: "dashed" });
  const longPdf = new TextDecoder("latin1").decode(buildThermalPdf(longElements));
  const height = (value) => Number(value.match(/\/MediaBox \[0 0 226\.77 ([\d.]+)\]/)?.[1]);
  assert.ok(height(longPdf) > height(shortPdf));
  assert.doesNotMatch(longPdf, /\bre\s+f\b|\brg\b/);
  assert.match(longPdf, /0 G 0\.45 w/);
});
