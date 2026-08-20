import { Building2, Bot, ServerCog, TicketCheck, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { platformApi } from "../api/client.js";

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    platformApi.overview().then(setOverview).catch((err) => setError(err.message));
  }, []);

  const metrics = useMemo(() => [
    { label: "Organizations", value: overview?.summary?.organizations ?? 0, icon: Building2 },
    { label: "Organization Admins", value: overview?.summary?.admins ?? 0, icon: UserCog },
    { label: "Tickets", value: overview?.summary?.tickets ?? 0, icon: TicketCheck },
    { label: "AI Runs", value: overview?.usage?.aiAnalysesTotal ?? 0, icon: Bot },
    { label: "Active Tenants", value: overview?.summary?.activeOrganizations ?? 0, icon: ServerCog },
  ], [overview]);

  return (
    <>
      <div className="page-heading">
        <h1>Platform Overview</h1>
        <p>Compliance-safe monitoring across tenants. Organization operations stay inside each admin workspace.</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="metric-grid">
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

      <section className="panel tenant-health-panel">
        <div className="panel-title">
          <div>
            <h2>Tenant Health</h2>
            <p className="panel-subtitle">Platform-visible organization status and operational totals.</p>
          </div>
          <span>{overview?.organizations?.length || 0} tenants</span>
        </div>

        <div className="tenant-health-table-wrap">
          <table className="tenant-health-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Status</th>
                <th>Admins</th>
                <th>Projects</th>
                <th>Active Tickets</th>
                <th>AI Runs</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.organizations || []).map((item) => (
                <tr key={item.organization.id}>
                  <td>
                    <strong>{item.organization.name}</strong>
                    <small>{item.organization.slug || item.organization.id}</small>
                  </td>
                  <td>
                    <span className={`status-pill ${item.organization.status || "active"}`}>
                      {item.organization.status || "active"}
                    </span>
                  </td>
                  <td>{item.counts.admins}</td>
                  <td>{item.counts.projects}</td>
                  <td>{item.counts.activeTickets}</td>
                  <td>{item.counts.aiAnalyses}</td>
                </tr>
              ))}
              {!overview?.organizations?.length ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-inline">No tenants available yet.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
