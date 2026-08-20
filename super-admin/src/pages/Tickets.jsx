import { Building2, Clock3, RotateCcw, Search, TicketCheck, UserCheck, Workflow } from "lucide-react";
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
    return organizations.filter((item) => !query || item.organization.name?.toLowerCase().includes(query));
  }, [organizations, search]);

  const metrics = [
    { label: "Total Tickets", value: overview?.summary?.total ?? 0, icon: TicketCheck },
    { label: "Open", value: overview?.summary?.open ?? 0, icon: Clock3 },
    { label: "Assigned", value: overview?.summary?.assigned ?? 0, icon: UserCheck },
    { label: "In Progress", value: overview?.summary?.inProgress ?? 0, icon: Workflow },
    { label: "Reopen Requests", value: overview?.summary?.reopenRequests ?? 0, icon: RotateCcw },
  ];

  return (
    <>
      <div className="page-heading">
        <h1>Global Tickets</h1>
        <p>Read-only platform monitoring across organizations. Ticket actions stay inside organization admin workspaces.</p>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className="metric-grid compact">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <span><Icon size={20} /></span>
              <div>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Organization Ticket Summary</h2>
            <p className="panel-subtitle">System-level counts only. No customer or developer data is shown here.</p>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input placeholder="Search organizations..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Total</th>
                <th>Open</th>
                <th>Assigned</th>
                <th>In Progress</th>
                <th>Completed</th>
                <th>Closed</th>
                <th>Reopen</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrganizations.map((item) => (
                <tr key={item.organization._id}>
                  <td>
                    <div className="entity-cell">
                      <span><Building2 size={17} /></span>
                      <div>
                        <strong>{item.organization.name}</strong>
                        <small>{item.organization.slug || "organization"}</small>
                      </div>
                    </div>
                  </td>
                  <td><strong>{item.counts.total}</strong></td>
                  <td>{item.counts.open}</td>
                  <td>{item.counts.assigned}</td>
                  <td>{item.counts.inProgress}</td>
                  <td>{item.counts.completed}</td>
                  <td>{item.counts.closed}</td>
                  <td>{item.counts.reopenRequests}</td>
                </tr>
              ))}
              {!visibleOrganizations.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">No organizations with tickets match this search.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
