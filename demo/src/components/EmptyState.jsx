export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state-pro">
      <div className="empty-state-badge">Sem registros</div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}
