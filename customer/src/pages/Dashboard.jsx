import { useAuth } from "../context/AuthContext";

const STATS = [
  { label: "Open tickets", value: "0" },
  { label: "Waiting on you", value: "0" },
  { label: "Resolved (30d)", value: "0" },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1 className="page-title">Your tickets</h1>
      <p className="page-subtitle">
        Signed in as {user?.name} · Customer Portal
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
          <div className="id-tag">NO-TICKETS</div>
          <p>You haven't raised any tickets yet. Start a new ticket to report an issue.</p>
        </div>
      </div>
    </>
  );
}
