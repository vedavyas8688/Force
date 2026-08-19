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
    { label: "Assigned", value: summary?.stats?.assignedTickets ?? 0 },
    { label: "In progress", value: summary?.stats?.inProgressTickets ?? 0 },
    { label: "Resolved", value: summary?.stats?.resolvedTickets ?? 0 },
    { label: "Closed", value: summary?.stats?.closedTickets ?? 0 },
  ];

  return (
    <>
      <h1 className="page-title">Assigned to you</h1>
      <p className="page-subtitle">Signed in as {user?.name} - Developer Portal</p>

      <div className="card-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="label">{stat.label}</div>
            <div className="value">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="panel stack-panel">
        <h2 className="section-title">Latest assignments</h2>
        {error && <div className="form-error table-notice">{error}</div>}
        {!summary?.recentTickets?.length ? (
          <div className="empty-state">
            <div className="id-tag">QUEUE-EMPTY</div>
            <p>Nothing assigned to you right now.</p>
          </div>
        ) : (
          <div className="ticket-list compact-ticket-list">
            {summary.recentTickets.map((ticket) => (
              <article className="ticket-card" key={ticket._id}>
                <div className="ticket-card-header">
                  <div>
                    <h3>{ticket.title}</h3>
                    <p>{ticket.projectId?.name || "No project"} - {ticket.customerId?.email || "No customer"}</p>
                  </div>
                  <span className="status-pill">{ticket.status}</span>
                </div>
                <div className="ticket-meta">
                  <span>{ticket.priority}</span>
                  <span>{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : ""}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
