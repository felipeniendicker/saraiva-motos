import { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "danger",
  processing = false,
  onConfirm,
  onCancel
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const openerRef = useRef(null);
  const confirmingRef = useRef(false);
  const processingRef = useRef(processing);
  const cancelCallbackRef = useRef(onCancel);
  processingRef.current = processing;
  cancelCallbackRef.current = onCancel;

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    confirmingRef.current = false;
    document.body.classList.add("shared-dialog-open");
    requestAnimationFrame(() => cancelRef.current?.focus());

    function handleKeyDown(event) {
      if (event.key === "Escape" && !processingRef.current) {
        event.preventDefault();
        cancelCallbackRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("shared-dialog-open");
      openerRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  async function handleConfirm() {
    if (processing || confirmingRef.current) return;
    confirmingRef.current = true;
    try { await onConfirm(); }
    finally { confirmingRef.current = false; }
  }

  return <div className="confirm-dialog-overlay" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !processing) onCancel();
  }}>
    <div className={`confirm-dialog-card confirm-dialog-${variant}`} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <div className="confirm-dialog-body">
        <span className="confirm-dialog-kicker">Confirmação necessária</span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{message}</p>
      </div>
      <div className="confirm-dialog-actions">
        <button type="button" className="secondary-button" ref={cancelRef} disabled={processing} onClick={onCancel}>Cancelar</button>
        <button type="button" className={variant === "danger" ? "danger-button" : "primary-button"} disabled={processing} onClick={handleConfirm}>{processing ? "Processando..." : confirmLabel}</button>
      </div>
    </div>
  </div>;
}
