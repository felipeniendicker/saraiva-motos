import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "saraiva-pwa-update-"));
const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");

function build(version, outDir) {
  execFileSync(process.execPath, [vite, "build", "--outDir", outDir, "--emptyOutDir"], {
    cwd: process.cwd(),
    env: { ...process.env, VITE_APP_VERSION: version },
    stdio: "pipe"
  });
  return {
    worker: readFileSync(join(outDir, "sw.js"), "utf8"),
    html: readFileSync(join(outDir, "index.html"), "utf8")
  };
}

try {
  const first = build("1.0.0-update-test", join(root, "v1"));
  const second = build("1.0.1-update-test", join(root, "v2"));
  assert.notEqual(first.worker, second.worker, "o service worker deve mudar entre versões");
  assert.match(second.worker, /clientsClaim\(\)/, "o novo worker deve assumir o cliente após confirmação");
  assert.match(second.worker, /SKIP_WAITING/, "a atualização deve aguardar a confirmação do operador");
  assert.notEqual(first.html, second.html, "o shell deve apontar para os assets da nova versão");
  process.stdout.write("Atualização PWA N → N+1 validada em builds isolados.\n");
} finally {
  rmSync(root, { recursive: true, force: true });
}
