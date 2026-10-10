import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readPngDimensions(filename) {
  const bytes = await readFile(new URL(`../../public/${filename}`, import.meta.url));
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("ícones PWA possuem os tamanhos exigidos", async () => {
  assert.deepEqual(await readPngDimensions("pwa-192x192.png"), { width: 192, height: 192 });
  assert.deepEqual(await readPngDimensions("pwa-512x512.png"), { width: 512, height: 512 });
  assert.deepEqual(await readPngDimensions("pwa-maskable-512x512.png"), { width: 512, height: 512 });
});
