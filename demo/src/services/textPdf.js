function escapePdfText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]/g, " ");
}

function encodeWindows1252(value) {
  const special = new Map([["€", 128], ["‚", 130], ["ƒ", 131], ["„", 132], ["…", 133], ["†", 134], ["‡", 135], ["ˆ", 136], ["‰", 137], ["Š", 138], ["‹", 139], ["Œ", 140], ["Ž", 142], ["‘", 145], ["’", 146], ["“", 147], ["”", 148], ["•", 149], ["–", 150], ["—", 151], ["˜", 152], ["™", 153], ["š", 154], ["›", 155], ["œ", 156], ["ž", 158], ["Ÿ", 159]]);
  return Uint8Array.from([...value].map((character) => {
    const code = character.codePointAt(0);
    if (code <= 255) return code;
    return special.get(character) ?? 63;
  }));
}

function concatBytes(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function buildTextPdf(lines, options = {}) {
  const paperWidth = options.paperWidth || 595.28;
  const leading = options.leading || 12;
  const fontSize = options.fontSize || 9;
  const margin = options.margin || 36;
  const paperHeight = Math.max(options.minHeight || 841.89, margin * 2 + lines.length * leading);
  const stream = ["BT", `/F1 ${fontSize} Tf`, `${leading} TL`, `${margin} ${paperHeight - margin} Td`,
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${paperWidth} ${paperHeight}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${encodeWindows1252(stream).length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  ];
  const parts = [encodeWindows1252("%PDF-1.4\n%âãÏÓ\n")];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const bytes = encodeWindows1252(`${index + 1} 0 obj\n${object}\nendobj\n`);
    parts.push(bytes);
    length += bytes.length;
  });
  const xrefOffset = length;
  const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer", `<< /Size ${objects.length + 1} /Root 1 0 R >>`, "startxref", String(xrefOffset), "%%EOF", ""].join("\n");
  parts.push(encodeWindows1252(xref));
  return concatBytes(parts);
}

export function downloadPdf(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
