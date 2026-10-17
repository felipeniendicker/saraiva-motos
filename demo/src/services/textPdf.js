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

function characterWidth(character, fontSize, bold = false) {
  let factor = 0.5;
  if (/\s/.test(character)) factor = 0.28;
  else if (/[ilI1.,:;'|!]/.test(character)) factor = 0.25;
  else if (/[MW@%&]/.test(character)) factor = 0.78;
  else if (/[A-Z0-9]/.test(character)) factor = 0.58;
  return fontSize * factor * (bold ? 1.035 : 1);
}

function textWidth(value, fontSize, bold = false) {
  return [...String(value ?? "")]
    .reduce((width, character) => width + characterWidth(character, fontSize, bold), 0);
}

function splitLongWord(word, maxWidth, fontSize, bold) {
  const parts = [];
  let part = "";
  for (const character of word) {
    if (part && textWidth(part + character, fontSize, bold) > maxWidth) {
      parts.push(part);
      part = character;
    } else {
      part += character;
    }
  }
  if (part) parts.push(part);
  return parts;
}

export function wrapPdfText(value, maxWidth, fontSize = 8, bold = false) {
  const paragraphs = String(value ?? "").replace(/\r/g, "").split("\n");
  const result = [];
  for (const paragraph of paragraphs) {
    const rawWords = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!rawWords.length) {
      result.push("");
      continue;
    }
    const words = rawWords.flatMap((word) => textWidth(word, fontSize, bold) > maxWidth
      ? splitLongWord(word, maxWidth, fontSize, bold)
      : [word]);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(candidate, fontSize, bold) > maxWidth) {
        result.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) result.push(line);
  }
  return result.length ? result : [""];
}

function layoutThermalElements(elements, contentWidth) {
  const operations = [];
  let cursor = 0;
  for (const element of elements) {
    cursor += element.gapBefore || 0;
    if (element.type === "rule") {
      operations.push({ type: "rule", top: cursor, style: element.style || "solid" });
      cursor += element.gapAfter ?? 5;
      continue;
    }

    const fontSize = element.fontSize || 8;
    const lineHeight = element.lineHeight || fontSize * 1.28;
    if (element.type === "pair") {
      const right = String(element.right ?? "");
      const rightWidth = Math.min(contentWidth * 0.48, textWidth(right, fontSize, element.boldRight));
      const leftWidth = Math.max(54, contentWidth - rightWidth - 7);
      const leftLines = wrapPdfText(element.left, leftWidth, fontSize, element.boldLeft);
      leftLines.forEach((line, index) => {
        operations.push({ type: "text", text: line, top: cursor, fontSize, bold: element.boldLeft, align: "left", width: leftWidth });
        if (index === 0 && right) {
          operations.push({ type: "text", text: right, top: cursor, fontSize, bold: element.boldRight, align: "right", width: contentWidth });
        }
        cursor += lineHeight;
      });
    } else {
      const lines = wrapPdfText(element.text, contentWidth, fontSize, element.bold);
      lines.forEach((line) => {
        operations.push({ type: "text", text: line, top: cursor, fontSize, bold: element.bold, align: element.align || "left", width: contentWidth });
        cursor += lineHeight;
      });
    }
    cursor += element.gapAfter || 0;
  }
  return { operations, contentHeight: cursor };
}

export function buildThermalPdf(elements, options = {}) {
  const paperWidth = options.paperWidth || 226.77;
  const margin = options.margin ?? 10;
  const bottomMargin = options.bottomMargin ?? margin;
  const contentWidth = paperWidth - margin * 2;
  const { operations, contentHeight } = layoutThermalElements(elements, contentWidth);
  const paperHeight = Math.max(72, margin + contentHeight + bottomMargin);
  const commands = [];

  for (const operation of operations) {
    if (operation.type === "rule") {
      const y = paperHeight - margin - operation.top;
      const dash = operation.style === "dotted" ? "[1 2] 0 d" : operation.style === "dashed" ? "[3 2] 0 d" : "[] 0 d";
      commands.push(`q 0 G 0.45 w ${dash} ${margin} ${y.toFixed(2)} m ${(paperWidth - margin).toFixed(2)} ${y.toFixed(2)} l S Q`);
      continue;
    }
    const width = textWidth(operation.text, operation.fontSize, operation.bold);
    let x = margin;
    if (operation.align === "center") x = margin + Math.max(0, (contentWidth - width) / 2);
    if (operation.align === "right") x = margin + Math.max(0, contentWidth - width);
    const y = paperHeight - margin - operation.top - operation.fontSize;
    commands.push(`BT /${operation.bold ? "F2" : "F1"} ${operation.fontSize} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(operation.text)}) Tj ET`);
  }

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${paperWidth} ${paperHeight.toFixed(2)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${encodeWindows1252(stream).length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
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
