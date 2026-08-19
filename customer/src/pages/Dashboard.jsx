import { useEffect, useState } from "react";
import { dashboardApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardApi
      .summary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  const stats = [
    { label: "My tickets", value: summary?.stats?.totalTickets ?? 0 },
    { label: "Open", value: summary?.stats?.openTickets ?? 0 },
    { label: "Resolved", value: summary?.stats?.resolvedTickets ?? 0 },
    { label: "Projects", value: summary?.stats?.activeProjects ?? 0 },
  ];

  return (
    <>
      <h1 className="page-title">Your tickets</h1>
      <p className="page-subtitle">Signed in as {user?.name} - Customer Portal</p>

      <div className="card-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="label">{stat.label}</div>
            <div className="value">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="panel stack-panel">
        <h2 className="section-title">Latest tickets</h2>
        {error && <div className="form-error table-notice">{error}</div>}
        {!summary?.recentTickets?.length ? (
          <div className="empty-state">
            <div className="id-tag">NO-TICKETS</div>
            <p>You have not raised any tickets yet. Start a new ticket to report an issue.</p>
          </div>
        ) : (
          <div className="ticket-list compact-ticket-list">
            {summary.recentTickets.map((ticket) => (
              <article className="ticket-card" key={ticket._id}>
                <div className="ticket-card-header">
                  <div>
                    <h3>{ticket.title}</h3>
                    <p>{ticket.projectId?.name || "No project"}</p>
                  </div>
                  <span className="status-pill">{ticket.status}</span>
                </div>
                <div className="ticket-meta">
                  <span>{ticket.priority}</span>
                  <span>{ticket.assignedTo?.email || "Unassigned"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
