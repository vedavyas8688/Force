import { Activity, Building2, GitBranch, ServerCog, TicketCheck, Users } from "lucide-react";
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
    { label: "Users", value: overview?.summary?.users ?? 0, icon: Users },
    { label: "Projects", value: overview?.summary?.projects ?? 0, icon: ServerCog },
    { label: "Tickets", value: overview?.summary?.tickets ?? 0, icon: TicketCheck },
    { label: "Git Installs", value: overview?.summary?.gitInstallations ?? 0, icon: GitBranch },
  ], [overview]);

  return (
    <>
      <div className="page-heading">
        <h1>Platform Overview</h1>
        <p>Monitor FORCE across all organizations. Organization Git settings stay inside each customer workspace.</p>
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

      <div className="split-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>Organizations</h2>
            <span>{overview?.organizations?.length || 0} total</span>
          </div>
          <div className="org-table">
            {(overview?.organizations || []).map((item) => (
              <div className="org-row" key={item.organization.id}>
                <div>
                  <strong>{item.organization.name}</strong>
                  <small>{item.organization.plan} / {item.organization.status}</small>
                </div>
                <span>{item.counts.users} users</span>
                <span>{item.counts.projects} projects</span>
                <span>{item.counts.activeTickets} active tickets</span>
                <span>{item.counts.gitInstallations} Git</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>System Health</h2>
            <Activity size={18} />
          </div>
          <div className="health-list">
            <div><span>Redis</span><strong>{overview?.queueHealth?.redis || "checking"}</strong></div>
            <div><span>Git Queue</span><strong>{overview?.queueHealth?.githubWorkerQueue || "checking"}</strong></div>
            <div><span>Active Organizations</span><strong>{overview?.summary?.activeOrganizations ?? 0}</strong></div>
            <div><span>Active Tickets</span><strong>{overview?.summary?.activeTickets ?? 0}</strong></div>
          </div>
        </section>
      </div>
    </>
  );
}
