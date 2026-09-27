export default function StatCard({ icon, label, value, hint, tone = "default" }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        <p className="stat-hint">{hint}</p>
      </div>
    </article>
  );
}
