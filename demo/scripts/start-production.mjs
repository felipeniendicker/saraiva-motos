import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT deve ser um número entre 1 e 65535.");
}

const serveCli = fileURLToPath(new URL("../node_modules/serve/build/main.js", import.meta.url));
const child = spawn(process.execPath, [
  serveCli,
  "-s",
  "dist",
  "-l",
  `tcp://0.0.0.0:${port}`,
  "--no-clipboard",
  "--no-port-switching"
], {
  stdio: "inherit"
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
