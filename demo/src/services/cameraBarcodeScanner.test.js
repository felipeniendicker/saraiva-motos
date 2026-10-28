import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraVideoConstraints,
  createBarcodeScanGate,
  getCameraErrorMessage,
  normalizeCameraBarcode,
  stopCameraSession,
  supportsRequiredNativeFormats
} from "./cameraBarcodeScanner.js";

test("leitura válida preserva zeros à esquerda", async () => {
  let received = "";
  const gate = createBarcodeScanGate(async (code) => { received = code; });

  assert.equal(await gate.accept(" 0001234567890 "), true);
  assert.equal(received, "0001234567890");
  assert.equal(normalizeCameraBarcode(null), "");
});

test("leitura repetida é ignorada enquanto a primeira está em processamento", async () => {
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const gate = createBarcodeScanGate(async () => { calls += 1; await pending; });

  const first = gate.accept("7891234567890");
  assert.equal(await gate.accept("7891234567890"), false);
  release();
  assert.equal(await first, true);
  assert.equal(calls, 1);
});

test("falha permite tentar a leitura novamente", async () => {
  let calls = 0;
  const gate = createBarcodeScanGate(async () => {
    calls += 1;
    if (calls === 1) throw new Error("falha simulada");
  });

  await assert.rejects(gate.accept("123"), /falha simulada/);
  assert.equal(await gate.accept("123"), true);
});

test("mensagens distinguem permissão negada e câmera indisponível", () => {
  assert.match(getCameraErrorMessage({ name: "NotAllowedError" }), /Permissão da câmera negada/);
  assert.match(getCameraErrorMessage({ name: "NotFoundError" }), /Nenhuma câmera compatível/);
  assert.match(getCameraErrorMessage({ name: "CameraUnavailableError" }), /não oferece acesso à câmera/);
});

test("fechamento encerra controles, tracks e vídeo", () => {
  let controlsStopped = 0;
  let trackStopped = 0;
  let paused = 0;
  const stream = { getTracks: () => [{ stop: () => { trackStopped += 1; } }] };
  const video = { srcObject: stream, pause: () => { paused += 1; } };

  stopCameraSession({ controls: { stop: () => { controlsStopped += 1; } }, stream, video });

  assert.equal(controlsStopped, 1);
  assert.equal(trackStopped, 1);
  assert.equal(paused, 1);
  assert.equal(video.srcObject, null);
});

test("câmera traseira é preferida e câmera selecionada usa deviceId exato", () => {
  assert.deepEqual(cameraVideoConstraints().video.facingMode, { ideal: "environment" });
  assert.deepEqual(cameraVideoConstraints("camera-2").video.deviceId, { exact: "camera-2" });
});

test("detector nativo só é priorizado quando suporta todos os formatos necessários", async () => {
  class CompleteDetector {
    static async getSupportedFormats() {
      return ["ean_13", "ean_8", "upc_a", "code_128", "qr_code"];
    }
  }
  class PartialDetector {
    static async getSupportedFormats() {
      return ["ean_13"];
    }
  }

  assert.equal(await supportsRequiredNativeFormats(CompleteDetector), true);
  assert.equal(await supportsRequiredNativeFormats(PartialDetector), false);
  assert.equal(await supportsRequiredNativeFormats(null), false);
});
