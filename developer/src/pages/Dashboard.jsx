import { useAuth } from "../context/AuthContext";

const STATS = [
  { label: "Assigned tickets", value: "0" },
  { label: "In progress", value: "0" },
  { label: "Fixed (30d)", value: "0" },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1 className="page-title">Assigned to you</h1>
      <p className="page-subtitle">
        Signed in as {user?.name} · Developer Portal
      </p>

      <div className="card-grid">
        {STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">QUEUE-EMPTY</div>
          <p>Nothing assigned to you right now. Fixed tickets will show their exact files and lines here.</p>
        </div>
      </div>
    </>
  );
}
