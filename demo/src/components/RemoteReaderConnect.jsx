import { useEffect, useRef, useState } from "react";
import { closeReaderSession, consumeReaderScan, createReaderSession } from "../services/remoteReaderApi.js";

export default function RemoteReaderConnect({ onCode }) {
  const [session, setSession] = useState(null); const [error, setError] = useState("");
  const onCodeRef = useRef(onCode);
  useEffect(() => { onCodeRef.current = onCode; }, [onCode]);
  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    const timer = setInterval(async () => { try { const scan = await consumeReaderScan(session.sessaoId); if (active && scan?.codigo) onCodeRef.current(scan.codigo); } catch (e) { if (active) setError(e.message); } }, 750);
    return () => { active = false; clearInterval(timer); };
  }, [session]);
  async function connect() { try { setSession(await createReaderSession()); setError(""); } catch (e) { setError(e.message); } }
  async function disconnect() { const current=session;setSession(null);if(current) await closeReaderSession(current.sessaoId).catch(()=>{}); }
  return <div className="remote-reader-connect">
    {!session ? <button type="button" className="secondary-button" onClick={connect}>Conectar celular</button> : <div className="remote-reader-card">
      <img src={session.qrCodeDataUrl} alt="QR Code temporário para conectar o celular" />
      <div><strong>Leia com o celular</strong><span>Válido por 5 minutos. O celular só envia códigos.</span><a href={session.url} target="_blank" rel="noreferrer">Abrir link de teste</a><button type="button" className="link-button" onClick={disconnect}>Encerrar conexão</button></div>
    </div>}
    {error && <small className="feedback-danger">{error}</small>}
  </div>;
}
