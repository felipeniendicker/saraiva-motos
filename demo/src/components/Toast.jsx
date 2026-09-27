export default function Toast({ toast, onClose }) {
  if (!toast) {
    return null;
  }

  return (
    <div className={`toast toast-${toast.type || "success"}`} role="status">
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" className="ghost-button" onClick={onClose}>
        Fechar
      </button>
    </div>
  );
}
