export const CAMERA_BARCODE_FORMATS = Object.freeze(["ean_13", "ean_8", "upc_a", "code_128"]);

export function normalizeCameraBarcode(value) {
  return String(value ?? "").trim();
}

export function createBarcodeScanGate(onDetected) {
  let processing = false;
  return {
    async accept(value) {
      const barcode = normalizeCameraBarcode(value);
      if (!barcode || processing) return false;
      processing = true;
      try {
        await onDetected(barcode);
        return true;
      } catch (error) {
        processing = false;
        throw error;
      }
    },
    reset() {
      processing = false;
    },
    isProcessing() {
      return processing;
    }
  };
}

export function getCameraErrorMessage(error) {
  if (globalThis.isSecureContext === false && globalThis.location?.hostname !== "localhost") {
    return "A câmera exige uma conexão HTTPS segura.";
  }
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Permissão da câmera negada. Libere o acesso nas configurações do navegador ou digite o código.";
  }
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return "Nenhuma câmera compatível foi encontrada neste aparelho.";
  }
  if (error?.name === "NotReadableError" || error?.name === "AbortError") {
    return "A câmera está ocupada ou não pôde ser iniciada. Feche outros aplicativos e tente novamente.";
  }
  if (error?.name === "CameraUnavailableError") {
    return "Este navegador não oferece acesso à câmera. Digite o código manualmente.";
  }
  return error?.message || "Não foi possível iniciar a leitura pela câmera.";
}

export function stopCameraSession(session = {}) {
  if (session.timerId != null) globalThis.clearTimeout?.(session.timerId);
  if (session.frameId != null) globalThis.cancelAnimationFrame?.(session.frameId);
  try {
    session.controls?.stop?.();
  } catch {
    // O stream ainda será encerrado diretamente abaixo.
  }
  const streams = new Set([
    session.stream,
    session.video?.srcObject
  ].filter(Boolean));
  for (const stream of streams) {
    stream.getTracks?.().forEach((track) => track.stop());
  }
  if (session.video) {
    session.video.pause?.();
    session.video.srcObject = null;
  }
  session.controls = null;
  session.stream = null;
  session.timerId = null;
  session.frameId = null;
}

export function cameraVideoConstraints(deviceId) {
  return {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
  };
}

export async function supportsRequiredNativeFormats(BarcodeDetectorClass = globalThis.BarcodeDetector) {
  if (!BarcodeDetectorClass) return false;
  if (typeof BarcodeDetectorClass.getSupportedFormats !== "function") return true;
  try {
    const supported = await BarcodeDetectorClass.getSupportedFormats();
    return CAMERA_BARCODE_FORMATS.every((format) => supported.includes(format));
  } catch {
    return false;
  }
}
