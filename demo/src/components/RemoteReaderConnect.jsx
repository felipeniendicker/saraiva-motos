import { useEffect, useRef, useState } from "react";
import { closeReaderSession, consumeReaderScan, createReaderSession } from "../services/remoteReaderApi.js";

const POLL_INTERVAL_MS = 750;

export default function RemoteReaderConnect({ onCode }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const onCodeRef = useRef(onCode);
  const sessionRef = useRef(null);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => () => {
    const activeSession = sessionRef.current;
    sessionRef.current = null;
    if (activeSession) closeReaderSession(activeSession.sessaoId).catch(() => {});
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    let pollTimer;
    let expirationTimer;

    async function pollNextReading() {
      try {
        const scan = await consumeReaderScan(session.sessaoId);
        if (active && scan?.codigo) await onCodeRef.current(scan.codigo);
      } catch (failure) {
        if (active) setError(failure.message);
      } finally {
        if (active) pollTimer = globalThis.setTimeout(pollNextReading, POLL_INTERVAL_MS);
      }
    }

    const expirationDelay = Math.max(0, Date.parse(session.expiraEm) - Date.now());
    expirationTimer = globalThis.setTimeout(() => {
      if (!active) return;
      sessionRef.current = null;
      setSession(null);
      setError("A conexão com o celular expirou. Gere um novo QR Code.");
    }, expirationDelay);
    pollNextReading();

    return () => {
      active = false;
      globalThis.clearTimeout(pollTimer);
      globalThis.clearTimeout(expirationTimer);
    };
  }, [session]);

  async function connect() {
    try {
      const created = await createReaderSession();
      sessionRef.current = created;
      setSession(created);
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  }

  async function disconnect() {
    if (!session || disconnecting) return;
    setDisconnecting(true);
    try {
      await closeReaderSession(session.sessaoId);
      sessionRef.current = null;
      setSession(null);
      setError("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setDisconnecting(false);
    }
  }

  return <div className="remote-reader-connect">
    {!session
      ? <button type="button" className="secondary-button" onClick={connect}>Conectar celular</button>
      : <div className="remote-reader-card">
        <img src={session.qrCodeDataUrl} alt="QR Code temporário para conectar o celular" />
        <div>
          <strong>Leia com o celular</strong>
          <span>Válido por 5 minutos. O celular só envia códigos.</span>
          <a href={session.url} target="_blank" rel="noreferrer">Abrir link de teste</a>
          <button type="button" className="link-button" disabled={disconnecting} onClick={disconnect}>
            {disconnecting ? "Encerrando..." : "Encerrar conexão"}
          </button>
        </div>
      </div>}
    {error && <small className="feedback-danger">{error}</small>}
  </div>;
}
