import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { isAppUpdateSafe, subscribeToAppUpdateSafety } from "../services/updateSafety.js";

const APP_VERSION = __APP_VERSION__;

function isRunningStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateSafe, setUpdateSafe] = useState(isAppUpdateSafe());
  const registrationStarted = useRef(false);
  const updateServiceWorker = useRef(null);

  useEffect(() => {
    if (!registrationStarted.current) {
      registrationStarted.current = true;
      updateServiceWorker.current = registerSW({
        immediate: true,
        onNeedRefresh() { setUpdateAvailable(true); }
      });
    }

    function handleInstallPrompt(event) {
      event.preventDefault();
      if (!isRunningStandalone()) setInstallPrompt(event);
    }
    function handleInstalled() { setInstallPrompt(null); }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    const unsubscribeSafety = subscribeToAppUpdateSafety(setUpdateSafe);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      unsubscribeSafety();
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function applyUpdate() {
    if (!isAppUpdateSafe()) {
      window.alert("Conclua ou cancele a venda ou movimentação em andamento antes de atualizar.");
      return;
    }
    if (!window.confirm("A atualização recarregará o sistema. Atualizar agora?")) return;
    await updateServiceWorker.current?.(true);
  }

  return (
    <div className="pwa-controls" aria-label="Instalação e atualização do aplicativo">
      <span className="app-version" title="Versão atual do aplicativo">v{APP_VERSION}</span>
      {installPrompt && <button type="button" className="pwa-action-button" onClick={installApp}>Instalar Saraiva Motos</button>}
      {updateAvailable && (
        <button type="button" className="pwa-update-button" onClick={applyUpdate} disabled={!updateSafe}>
          {updateSafe ? "Atualização disponível" : "Atualização aguardando operação"}
        </button>
      )}
    </div>
  );
}
