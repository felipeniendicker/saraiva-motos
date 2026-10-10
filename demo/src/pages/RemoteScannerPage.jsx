import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getRemoteReaderStatus, sendRemoteScan } from "../services/remoteReaderApi.js";

export default function RemoteScannerPage() {
  const { token } = useParams(); const videoRef=useRef(null); const lastRef=useRef({code:"",at:0}); const [code,setCode]=useState(""); const [message,setMessage]=useState("Validando pareamento...");
  useEffect(() => { let stream;let timer;let stopped=false;(async()=>{try{const status=await getRemoteReaderStatus(token);if(!status.ativo)throw new Error("Pareamento expirado.");setMessage("Aponte a câmera para o código de barras.");if(!navigator.mediaDevices?.getUserMedia||!("BarcodeDetector" in globalThis)){setMessage("Leitura automática indisponível. Digite o código abaixo.");return;}stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});videoRef.current.srcObject=stream;const detector=new BarcodeDetector({formats:["ean_13","ean_8","upc_a"]});timer=setInterval(async()=>{if(stopped||videoRef.current.readyState<2)return;const found=await detector.detect(videoRef.current).catch(()=>[]);if(found[0]?.rawValue) await transmit(found[0].rawValue);},500);}catch(e){setMessage(e.message);}})();return()=>{stopped=true;clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());};},[token]);
  async function transmit(value){const normalized=String(value).trim();const now=Date.now();if(lastRef.current.code===normalized&&now-lastRef.current.at<2000)return;lastRef.current={code:normalized,at:now};try{await sendRemoteScan(token,normalized);setMessage(`Código ${normalized} enviado.`);}catch(e){setMessage(e.message);}}
  return <main className="remote-scanner-page"><section><h1>Saraiva Motos</h1><p>{message}</p><video ref={videoRef} autoPlay muted playsInline />
    <form onSubmit={(e)=>{e.preventDefault();transmit(code);setCode("");}}><label>Código manual<input value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,""))} inputMode="numeric" pattern="\d{8}|\d{12}|\d{13}" required /></label><button className="primary-button">Enviar código</button></form>
    <small>Esta tela não acessa preços, clientes, carrinho ou finalização de vendas.</small></section></main>;
}
