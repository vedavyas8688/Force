import { useEffect, useMemo, useState } from "react";
import { globalTicketsApi } from "../api/client.js";

export default function Tickets() {
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    globalTicketsApi.overview().then(setOverview).catch((err) => setError(err.message));
  }, []);

  const organizations = overview?.organizations || [];
  const visibleOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizations.filter((item) =>
      !query || item.organization.name?.toLowerCase().includes(query)
    );
  }, [organizations, search]);

  return (
    <>
      <div className="page-heading">
        <h1>Global Tickets</h1>
        <p>Read-only platform monitoring across organizations. Ticket operations stay in organization admin workspaces.</p>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className="metric-grid compact">
        <article className="metric-card"><small>Total</small><strong>{overview?.summary?.total ?? 0}</strong></article>
        <article className="metric-card"><small>Open</small><strong>{overview?.summary?.open ?? 0}</strong></article>
        <article className="metric-card"><small>Assigned</small><strong>{overview?.summary?.assigned ?? 0}</strong></article>
        <article className="metric-card"><small>In Progress</small><strong>{overview?.summary?.inProgress ?? 0}</strong></article>
        <article className="metric-card"><small>Reopen</small><strong>{overview?.summary?.reopenRequests ?? 0}</strong></article>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>Organizations With Tickets</h2>
          <input placeholder="Search organizations..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="org-table">
          {visibleOrganizations.map((item) => (
            <div className="org-row ticket-overview-row" key={item.organization._id}>
              <div>
                <strong>{item.organization.name}</strong>
                <small>{item.userCounts.total} users / {item.highUrgentTickets} high or urgent</small>
              </div>
              <span>Total {item.counts.total}</span>
              <span>Open {item.counts.open}</span>
              <span>Assigned {item.counts.assigned}</span>
              <span>Progress {item.counts.inProgress}</span>
              <span>Closed {item.counts.closed}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
