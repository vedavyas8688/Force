import { Activity, Bot, ServerCog, ShieldCheck, TicketCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { platformApi } from "../api/client.js";

export default function Usage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    platformApi.overview().then(setOverview).catch((err) => setError(err.message));
  }, []);

  const usage = overview?.usage || {};
  const cards = useMemo(() => [
    { label: "AI Analyses", value: usage.aiAnalysesTotal ?? 0, icon: Bot },
    { label: "Completed AI", value: usage.aiAnalysesCompleted ?? 0, icon: Activity },
    { label: "AI Last 7 Days", value: usage.aiAnalysesLast7Days ?? 0, icon: Activity },
    { label: "Tickets Last 7 Days", value: usage.ticketsCreatedLast7Days ?? 0, icon: TicketCheck },
    { label: "Active Tenants", value: overview?.summary?.activeOrganizations ?? 0, icon: ShieldCheck },
  ], [usage, overview]);

  return (
    <>
      <div className="page-heading">
        <h1>Usage & Compliance</h1>
        <p>Platform-level visibility only. Tenant operations and private workspace data remain organization-scoped.</p>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className="metric-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metric-card" key={card.label}>
              <span><Icon size={20} /></span>
              <div>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>AI Providers</h2>
            <Bot size={18} />
          </div>
          <div className="health-list">
            <div><span>External AI Calls</span><strong>{usage.externalAiEnabled ? "enabled" : "disabled"}</strong></div>
            <div><span>Fallback Order</span><strong>{usage.providerOrder?.join(" -> ") || "-"}</strong></div>
            {Object.entries(usage.providerCounts || {}).map(([provider, count]) => (
              <div key={provider}><span>{provider}</span><strong>{count}</strong></div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>System Health</h2>
            <ServerCog size={18} />
          </div>
          <div className="health-list">
            <div><span>Redis</span><strong>{overview?.queueHealth?.redis || "checking"}</strong></div>
            <div><span>Active Organizations</span><strong>{overview?.summary?.activeOrganizations ?? 0}</strong></div>
            <div><span>Failed AI Analyses</span><strong>{usage.aiAnalysesFailed ?? 0}</strong></div>
          </div>
        </section>
      </div>
    </>
  );
}
