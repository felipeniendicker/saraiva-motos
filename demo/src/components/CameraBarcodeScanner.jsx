import { useEffect, useRef, useState } from "react";
import {
  CAMERA_BARCODE_FORMATS,
  cameraVideoConstraints,
  createBarcodeScanGate,
  getCameraErrorMessage,
  stopCameraSession,
  supportsRequiredNativeFormats
} from "../services/cameraBarcodeScanner.js";

const SCAN_INTERVAL_MS = 220;

async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

export default function CameraBarcodeScanner({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const gateRef = useRef(null);
  const mountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [engine, setEngine] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
    onDetectedRef.current = onDetected;
  }, [onClose, onDetected]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const session = { video: videoRef.current };
    gateRef.current = createBarcodeScanGate(async (barcode) => {
      if (cancelled) return;
      setStatus("recognized");
      stopCameraSession(session);
      await onDetectedRef.current(barcode);
      await new Promise((resolve) => globalThis.setTimeout(resolve, 350));
      if (!cancelled && mountedRef.current) onCloseRef.current();
    });

    async function updateDevices() {
      const cameras = await listCameras().catch(() => []);
      if (cancelled) return;
      setDevices(cameras);
      const currentId = session.video?.srcObject?.getVideoTracks?.()[0]?.getSettings?.().deviceId;
      if (currentId) setDeviceId(currentId);
    }

    async function startNative() {
      const constraints = cameraVideoConstraints(deviceId);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      session.stream = stream;
      session.video.srcObject = stream;
      await session.video.play();
      const detector = new globalThis.BarcodeDetector({ formats: CAMERA_BARCODE_FORMATS });
      setEngine("native");
      setStatus("scanning");
      await updateDevices();

      async function detect() {
        if (cancelled || gateRef.current?.isProcessing()) return;
        if (session.video.readyState >= 2) {
          const results = await detector.detect(session.video).catch(() => []);
          if (results[0]?.rawValue) {
            await gateRef.current.accept(results[0].rawValue).catch((failure) => {
              if (!cancelled) {
                gateRef.current.reset();
                setError(failure.message || "Não foi possível processar o código.");
                setStatus("error");
              }
            });
            return;
          }
        }
        if (!cancelled) session.timerId = globalThis.setTimeout(detect, SCAN_INTERVAL_MS);
      }
      detect();
    }

    async function startFallback() {
      const { BrowserCodeReader, BrowserMultiFormatOneDReader } = await import("@zxing/browser");
      if (cancelled) return;
      const reader = new BrowserMultiFormatOneDReader(undefined, {
        delayBetweenScanAttempts: SCAN_INTERVAL_MS,
        delayBetweenScanSuccess: SCAN_INTERVAL_MS
      });
      session.controls = await reader.decodeFromConstraints(
        cameraVideoConstraints(deviceId),
        session.video,
        (result) => {
          if (!result || cancelled || gateRef.current?.isProcessing()) return;
          gateRef.current.accept(result.getText()).catch((failure) => {
            if (!cancelled) {
              gateRef.current.reset();
              setError(failure.message || "Não foi possível processar o código.");
              setStatus("error");
            }
          });
        }
      );
      if (cancelled) {
        stopCameraSession(session);
        return;
      }
      setEngine("zxing");
      setStatus("scanning");
      const cameras = await BrowserCodeReader.listVideoInputDevices().catch(() => []);
      if (!cancelled) {
        setDevices(cameras);
        const currentId = session.video?.srcObject?.getVideoTracks?.()[0]?.getSettings?.().deviceId;
        if (currentId) setDeviceId(currentId);
      }
    }

    async function start() {
      setStatus("starting");
      setError("");
      setEngine("");
      if (!navigator.mediaDevices?.getUserMedia) {
        const unavailable = new Error("Câmera indisponível");
        unavailable.name = "CameraUnavailableError";
        throw unavailable;
      }
      if (await supportsRequiredNativeFormats()) {
        try {
          await startNative();
        } catch (failure) {
          stopCameraSession(session);
          if (["NotAllowedError", "SecurityError", "NotFoundError", "NotReadableError"].includes(failure?.name)) {
            throw failure;
          }
          await startFallback();
        }
      } else {
        await startFallback();
      }
    }

    start().catch((failure) => {
      stopCameraSession(session);
      if (!cancelled) {
        setError(getCameraErrorMessage(failure));
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
      stopCameraSession(session);
    };
  }, [open, deviceId, retryKey]);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!open) return null;

  function switchCamera() {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((device) => device.deviceId === deviceId);
    const next = devices[(currentIndex + 1 + devices.length) % devices.length];
    setDeviceId(next.deviceId);
  }

  return <div className="camera-scanner-overlay" role="presentation">
    <section className="camera-scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="camera-scanner-title">
      <header>
        <div>
          <h2 id="camera-scanner-title">Ler código de barras</h2>
          <p>Aponte a câmera para o código e mantenha o celular firme.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onClose} aria-label="Fechar câmera">Fechar</button>
      </header>
      <div className={`camera-scanner-preview status-${status}`}>
        <video ref={videoRef} autoPlay muted playsInline />
        <div className="camera-scanner-frame" aria-hidden="true" />
        {status === "recognized" && <div className="camera-scanner-recognized" role="status">Código reconhecido</div>}
      </div>
      <p className={error ? "camera-scanner-message error" : "camera-scanner-message"} role={error ? "alert" : "status"}>
        {error || (status === "starting" ? "Iniciando câmera..." : "Enquadre todo o código dentro da área destacada.")}
      </p>
      {engine && <small className="camera-scanner-engine">Leitura no aparelho · {engine === "native" ? "detector do navegador" : "modo compatível"}</small>}
      <div className="camera-scanner-actions">
        {devices.length > 1 && <button type="button" className="secondary-button" onClick={switchCamera}>Alternar câmera</button>}
        {status === "error" && <button type="button" className="primary-button" onClick={() => setRetryKey((value) => value + 1)}>Tentar novamente</button>}
        <button type="button" className="secondary-button" onClick={onClose}>Digitar código</button>
      </div>
    </section>
  </div>;
}
