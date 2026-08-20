import {
  Building2,
  CheckCircle2,
  Eye,
  FolderKanban,
  Search,
  TicketCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { platformApi } from "../api/client.js";

export default function Organizations() {
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [approvingId, setApprovingId] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await platformApi.overview();
      setOverview(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (overview?.organizations || []).filter((item) => {
      const org = item.organization;
      return !query || org.name.toLowerCase().includes(query) || org.slug.toLowerCase().includes(query);
    });
  }, [overview, search]);

  async function deleteOrganization(item) {
    const confirmed = window.confirm(
      `Delete ${item.organization.name}? This removes its users, projects, tickets, notifications, and audit records.`
    );
    if (!confirmed) return;

    setDeletingId(item.organization.id);
    setError("");
    setNotice("");
    try {
      await platformApi.deleteOrganization(item.organization.id);
      setNotice(`${item.organization.name} deleted`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId("");
    }
  }

  async function approveOrganization(item) {
    setApprovingId(item.organization.id);
    setError("");
    setNotice("");
    try {
      const result = await platformApi.approveOrganization(item.organization.id);
      setNotice(result?.message || `${item.organization.name} approved and invite email sent`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setApprovingId("");
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Organizations</h1>
        <p>Read-only tenant directory for Super Admin compliance, people visibility, and platform monitoring.</p>
      </div>
      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="metric-grid">
        <Metric label="Organizations" value={overview?.summary?.organizations || 0} icon={Building2} />
        <Metric label="Admins" value={overview?.summary?.admins || 0} icon={UserCog} />
        <Metric label="Projects" value={overview?.summary?.projects || 0} icon={FolderKanban} />
        <Metric label="Tickets" value={overview?.summary?.tickets || 0} icon={TicketCheck} />
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>Tenant Directory</h2>
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
                <th>Status</th>
                <th>Admins</th>
                <th>Projects</th>
                <th>Tickets</th>
                <th>Last Activity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.organization.id}>
                  <td>
                    <div className="entity-cell">
                      <span><Building2 size={17} /></span>
                      <div>
                        <strong>{item.organization.name}</strong>
                        <small>{item.organization.slug}</small>
                      </div>
                    </div>
                  </td>
                  <td><span className={`pill ${item.organization.status}`}>{item.organization.status}</span></td>
                  <td><UserCog size={15} /> {item.counts.admins}</td>
                  <td>{item.counts.projects}</td>
                  <td>{item.counts.tickets}</td>
                  <td>{formatDate(item.lastActivity)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="ghost-button small-action" type="button" onClick={() => setSelected(item)}>
                        <Eye size={14} />
                        View
                      </button>
                      {item.organization.status === "pending" && (
                        <button
                          className="success-button small-action"
                          type="button"
                          disabled={approvingId === item.organization.id}
                          onClick={() => approveOrganization(item)}
                        >
                          <CheckCircle2 size={14} />
                          {approvingId === item.organization.id ? "Approving" : "Approve"}
                        </button>
                      )}
                      <button
                        className="danger-button small-action"
                        type="button"
                        disabled={deletingId === item.organization.id}
                        onClick={() => deleteOrganization(item)}
                      >
                        <Trash2 size={14} />
                        {deletingId === item.organization.id ? "Deleting" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No organizations match this search.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="modal-card tenant-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>

            <div className="tenant-detail-head">
              <div className="entity-cell">
                <span><Building2 size={18} /></span>
                <div>
                  <strong>{selected.organization.name}</strong>
                  <small>{selected.organization.slug}</small>
                </div>
              </div>
              <span className={`pill modal-status ${selected.organization.status}`}>{selected.organization.status}</span>
            </div>

            <div className="tenant-stat-strip">
              <CompactStat label="Admins" value={selected.counts.admins} />
              <CompactStat label="Projects" value={selected.counts.projects} />
              <CompactStat label="Tickets" value={selected.counts.tickets} />
              <CompactStat label="AI Runs" value={selected.counts.aiAnalyses} />
            </div>

            <div className="activity-card">
              <small>Last Activity</small>
              <strong>{formatDate(selected.lastActivity)}</strong>
            </div>

            <MemberList title="Organization Admins" icon={UserCog} members={selected.members?.admins || []} />
          </section>
        </div>
      )}
    </>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <article className="metric-card">
      <span><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function CompactStat({ label, value }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function MemberList({ title, icon: Icon, members }) {
  return (
    <div className="sub-panel">
      <div className="sub-panel-title">
        <Icon size={16} />
        <strong>{title}</strong>
        <span>{members.length}</span>
      </div>
      {members.length ? (
        <div className="member-list">
          {members.map((member) => (
            <div key={member.id} className="member-row">
              <span>{member.name?.[0]?.toUpperCase() || "U"}</span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </div>
              <em className={`pill ${member.status}`}>{member.status}</em>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">No {title.toLowerCase()} yet.</div>
      )}
    </div>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}
