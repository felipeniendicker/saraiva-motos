export default function LoadingState({ message = "Carregando..." }) {
  return <div className="section-loading shared-loading-state" role="status">
    <span className="loading-indicator" aria-hidden="true" />
    <span>{message}</span>
  </div>;
}
