import { useAuth } from "../context/AuthContext";

const STATS = [
  { label: "Open tickets", value: "0" },
  { label: "Awaiting review", value: "0" },
  { label: "Active projects", value: "0" },
  { label: "Connected repos", value: "0" },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1 className="page-title">Organization overview</h1>
      <p className="page-subtitle">
        Signed in as {user?.name} · Admin Portal
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
          <div className="id-tag">ORG-EMPTY</div>
          <p>No activity yet. Connect a project's GitHub repository and invite your team to get started.</p>
        </div>
      </div>
    </>
  );
}
