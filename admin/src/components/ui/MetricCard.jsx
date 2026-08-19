export function MetricCard({ icon: Icon, label, value, delta, tone = "violet" }) {
  return (
    <div className="metric-card">
      <span className={`metric-icon ${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {delta && <small>{delta}</small>}
      </div>
    </div>
  );
}
