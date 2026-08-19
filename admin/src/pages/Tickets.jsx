import {
  BellRing,
  CheckCircle2,
  CircleGauge,
  Eye,
  LockKeyhole,
  MoreVertical,
  Pencil,
  Settings,
  Ticket,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminTicketsApi } from "../api/client";
import { DataTable, DataTablePanel, TablePagination } from "../components/ui/DataTable";
import { MetricGrid } from "../components/ui/MetricGrid";
import { SearchBox, Toolbar } from "../components/ui/Toolbar";

const tabs = [
  { key: "open", label: "Open", statuses: ["open", "triaged"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { key: "pending_customer", label: "Pending Customer", statuses: ["pending_customer"] },
  { key: "completed", label: "Completed", statuses: ["completed", "resolved"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
];

const statuses = ["open", "assigned", "in_progress", "pending_customer", "completed", "closed"];

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const [overview, setOverview] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [viewMode, setViewMode] = useState("overview");
  const [activeTab, setActiveTab] = useState("open");
  const [commentByTicket, setCommentByTicket] = useState({});
  const [noteByTicket, setNoteByTicket] = useState({});
  const [reviewNoteByRequest, setReviewNoteByRequest] = useState({});
  const [busyTicketId, setBusyTicketId] = useState("");
  const [error, setError] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [orgStatus, setOrgStatus] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    const search = searchParams.get("search") || "";
    if (search) {
      setOrgSearch(search);
      setTicketSearch(search);
    }
  }, [searchParams]);

  const organizations = overview?.organizations || [];
  const selectedOrg = organizations.find((item) => item.organization._id === selectedOrgId);
  const selectedTicket = selectedOrg?.tickets.find((ticket) => ticket._id === selectedTicketId);

  const visibleOrganizations = useMemo(() => {
    const search = orgSearch.trim().toLowerCase();
    return organizations
      .filter((item) => {
        const matchesSearch =
          !search ||
          item.organization.name?.toLowerCase().includes(search) ||
          item.organization.domain?.toLowerCase().includes(search);
        const matchesStatus = orgStatus === "all" || item.organization.status === orgStatus;
        return item.activeTickets > 0 && matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.activeTickets - a.activeTickets)
      .slice(0, 5);
  }, [orgSearch, orgStatus, organizations]);

  const filteredTickets = useMemo(() => {
    if (!selectedOrg) return [];
    const tab = tabs.find((item) => item.key === activeTab);
    const search = ticketSearch.trim().toLowerCase();
    return selectedOrg.tickets.filter((ticket) => {
      const matchesTab = tab.statuses.includes(ticket.status);
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      const matchesSearch =
        !search ||
        ticket.title?.toLowerCase().includes(search) ||
        ticket.description?.toLowerCase().includes(search) ||
        ticket.customerId?.email?.toLowerCase().includes(search) ||
        ticket.projectId?.name?.toLowerCase().includes(search) ||
        shortId(ticket._id).toLowerCase().includes(search);
      return matchesTab && matchesPriority && matchesSearch;
    });
  }, [activeTab, priorityFilter, selectedOrg, ticketSearch]);

  useEffect(() => {
    if (viewMode !== "organization" || !selectedOrg) return;
    if (selectedOrg.tickets.length === 0) return;
    if (filteredTickets.length > 0) return;

    const nextTab = firstAvailableTab(selectedOrg.tickets);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, filteredTickets.length, selectedOrg, viewMode]);

  async function loadOverview() {
    setError("");
    try {
      const data = await adminTicketsApi.overview();
      setOverview(data);
      if (!selectedOrgId && data.organizations?.[0]) {
        setSelectedOrgId(data.organizations[0].organization._id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function runTicketAction(ticketId, action) {
    setBusyTicketId(ticketId);
    setError("");
    try {
      const data = await action();
      setOverview((current) => replaceTicketInOverview(current, data.ticket));
      setSelectedTicketId(data.ticket._id);
      adminTicketsApi.overview().then(setOverview).catch(() => {});
      return data.ticket;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusyTicketId("");
    }
  }

  async function updateStatus(ticketId, status) {
    const ticket = await runTicketAction(ticketId, () =>
      adminTicketsApi.updateStatus(ticketId, status)
    );
    if (ticket) setActiveTab(tabForStatus(ticket.status));
  }

  async function addComment(ticketId) {
    const body = (commentByTicket[ticketId] || "").trim();
    if (!body) return;
    await runTicketAction(ticketId, () => adminTicketsApi.addComment(ticketId, body));
    setCommentByTicket((current) => ({ ...current, [ticketId]: "" }));
  }

  async function addInternalNote(ticketId) {
    const body = (noteByTicket[ticketId] || "").trim();
    if (!body) return;
    await runTicketAction(ticketId, () => adminTicketsApi.addInternalNote(ticketId, body));
    setNoteByTicket((current) => ({ ...current, [ticketId]: "" }));
  }

  async function reviewReopen(ticketId, requestId, decision) {
    const key = `${ticketId}:${requestId}`;
    const ticket = await runTicketAction(ticketId, () =>
      adminTicketsApi.reviewReopenRequest(
        ticketId,
        requestId,
        decision,
        reviewNoteByRequest[key] || ""
      )
    );
    if (ticket) setActiveTab(tabForStatus(ticket.status));
    setReviewNoteByRequest((current) => ({ ...current, [key]: "" }));
  }

  function exportTickets() {
    if (!filteredTickets.length || !selectedOrg) return;
    const rows = [
      ["Ticket ID", "Subject", "Customer", "Project", "Priority", "Status", "Assigned To", "Created", "Updated", "SLA"],
      ...filteredTickets.map((ticket) => [
        shortId(ticket._id),
        ticket.title || "",
        ticket.customerId?.email || "",
        ticket.projectId?.name || "",
        ticket.priority || "",
        ticket.status || "",
        ticket.assignedTo?.email || "Unassigned",
        ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "",
        ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "",
        slaStatus(ticket),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedOrg.organization.name || "organization"}-tickets.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {error && <div className="form-error table-notice">{error}</div>}

      {viewMode === "overview" && (
        <>
          <div className="page-heading-row">
            <div>
              <h1 className="page-title">Global Ticket Command Center</h1>
              <p className="page-subtitle">Monitor and manage tickets across all organizations</p>
            </div>
          </div>

          <MetricGrid items={summaryCards(overview?.summary)} />

          <Toolbar title="Organizations Overview" subtitle="All organizations and their ticket summary">
            <SearchBox
              placeholder="Search organization..."
              value={orgSearch}
              onChange={(event) => setOrgSearch(event.target.value)}
            />
            <select
              className="toolbar-select"
              value={orgStatus}
              onChange={(event) => setOrgStatus(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </Toolbar>

          <DataTablePanel>
            <DataTable
              className="org-table"
              columns={[
                "Organization",
                "Users",
                "Active Tickets",
                "Open",
                "Assigned",
                "In Progress",
                "Reopen Requests",
                "Action",
              ]}
            >
            {visibleOrganizations.map((item) => (
              <div className="data-grid-row org-table-row" key={item.organization._id}>
                <div className="org-name-cell">
                  <div className="org-logo compact-logo">{item.organization.name?.[0]?.toUpperCase() || "O"}</div>
                  <div>
                    <strong>{item.organization.name}</strong>
                    <small>ID: {orgCode(item.organization._id)}</small>
                  </div>
                </div>
                <span className="org-users-count">
                  <UsersRound size={16} />
                  <strong>{item.userCounts.total}</strong>
                  <small>Users</small>
                </span>
                <span><strong>{item.activeTickets}</strong><small> Active</small></span>
                <span className="count-blue">{item.counts.open}</span>
                <span className="count-orange">{item.counts.assigned}</span>
                <span className="count-purple">{item.counts.inProgress}</span>
                <span className="count-red">{item.counts.reopenRequests}</span>
                <div className="org-row-actions">
                  <button
                    className="org-view-small"
                    type="button"
                    onClick={() => {
                      setSelectedOrgId(item.organization._id);
                      setSelectedTicketId("");
                      setActiveTab(firstAvailableTab(item.tickets));
                      setViewMode("organization");
                    }}
                  >
                    View
                  </button>
                  <MoreVertical size={17} className="muted-icon" />
                </div>
              </div>
            ))}
            </DataTable>
            {visibleOrganizations.length === 0 && (
              <div className="empty-state">
                <div className="id-tag">NO-ORGS</div>
                <p>No active organizations with open work match this filter.</p>
              </div>
            )}
            {visibleOrganizations.length > 0 && (
              <TablePagination
                start={1}
                end={visibleOrganizations.length}
                total={visibleOrganizations.length}
                label="active organizations"
                page={1}
                totalPages={1}
                pageSize={5}
                pageSizeOptions={[5]}
                disabled
              />
            )}
          </DataTablePanel>
          {topOpenOrganizations(visibleOrganizations).length > 0 && (
            <section className="top-open-panel">
              <h2>Top Open Organizations</h2>
              <div className="top-open-list">
                {topOpenOrganizations(visibleOrganizations).map((item) => (
                  <button
                    key={item.organization._id}
                    type="button"
                    onClick={() => {
                      setSelectedOrgId(item.organization._id);
                      setSelectedTicketId("");
                      setActiveTab(firstAvailableTab(item.tickets));
                      setViewMode("organization");
                    }}
                  >
                    <span>{item.organization.name}</span>
                    <strong>{item.counts.open} open</strong>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {viewMode === "organization" && selectedOrg && (
        <section className="global-ticket-workspace">
          <button className="back-button" type="button" onClick={() => {
            setViewMode("overview");
            setSelectedTicketId("");
          }}>
            Back to organizations
          </button>
          <div className="workspace-header">
            <div>
              <span>Organizations &gt; {selectedOrg.organization.name}</span>
              <h2>{selectedOrg.organization.name}</h2>
              <p>{titleCase(selectedOrg.organization.plan)} Plan / Created {selectedOrg.organization.createdAt ? new Date(selectedOrg.organization.createdAt).toLocaleDateString() : "-"}</p>
            </div>
            <div className="workspace-counts">
              <span>{selectedOrg.userCounts.customers} customers</span>
              <span>{selectedOrg.userCounts.developers} agents</span>
              <span>{selectedOrg.counts.total} tickets</span>
            </div>
            <button className="org-settings-button" type="button" onClick={() => { window.location.href = "/settings"; }}>
              <Settings size={16} />
              Organization Settings
            </button>
          </div>

          <MetricGrid items={summaryCards(selectedOrg.counts)} className="org-metric-strip" />

          <div className="ticket-tabs">
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.key ? "ticket-tab active" : "ticket-tab"}
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span>{countForTab(selectedOrg.tickets, tab)}</span>
              </button>
            ))}
          </div>

          <div className="ticket-master-detail">
            <div className="ticket-filter-bar">
              <SearchBox
                placeholder="Search tickets..."
                value={ticketSearch}
                onChange={(event) => setTicketSearch(event.target.value)}
              />
              <select
                className="toolbar-select"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                className="btn-primary inline-button"
                type="button"
                disabled={!filteredTickets.length}
                onClick={exportTickets}
              >
                Export
              </button>
            </div>
            <div className="ticket-table-panel">
              {filteredTickets.length === 0 ? (
                <div className="empty-state">
                  <div className="id-tag">NO-TICKETS</div>
                  <p>No tickets in this status.</p>
                </div>
              ) : (
                <div className="admin-ticket-list">
                  {filteredTickets.map((ticket) => (
                    <button
                      className={selectedTicketId === ticket._id ? "admin-ticket-row active" : "admin-ticket-row"}
                      type="button"
                      key={ticket._id}
                      onClick={() => setSelectedTicketId(ticket._id)}
                    >
                      <span className="ticket-id">{shortId(ticket._id)}</span>
                      <strong>{ticket.title}</strong>
                      <span>{ticket.customerId?.email || "-"}</span>
                      <span>{ticket.projectId?.name || "-"}</span>
                      <span>{ticket.priority}</span>
                      <span>{ticket.assignedTo?.email || "Unassigned"}</span>
                      <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "-"}</span>
                      <span>{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : "-"}</span>
                      <span className={slaClass(ticket)}>{slaStatus(ticket)}</span>
                      <Eye size={15} />
                      <Pencil size={15} />
                      <MoreVertical size={15} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ticket-detail-panel">
              {!selectedTicket ? (
                <div className="empty-state">
                  <div className="id-tag">SELECT-TICKET</div>
                  <p>Select a ticket to open conversation, internal notes, and history.</p>
                </div>
              ) : (
                <TicketDetail
                  ticket={selectedTicket}
                  busy={busyTicketId === selectedTicket._id}
                  comment={commentByTicket[selectedTicket._id] || ""}
                  note={noteByTicket[selectedTicket._id] || ""}
                  reviewNotes={reviewNoteByRequest}
                  onCommentChange={(value) =>
                    setCommentByTicket((current) => ({ ...current, [selectedTicket._id]: value }))
                  }
                  onNoteChange={(value) =>
                    setNoteByTicket((current) => ({ ...current, [selectedTicket._id]: value }))
                  }
                  onReviewNoteChange={(key, value) =>
                    setReviewNoteByRequest((current) => ({ ...current, [key]: value }))
                  }
                  onStatusChange={updateStatus}
                  onComment={addComment}
                  onInternalNote={addInternalNote}
                  onReviewReopen={reviewReopen}
                />
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function TicketDetail({
  ticket,
  busy,
  comment,
  note,
  reviewNotes,
  onCommentChange,
  onNoteChange,
  onReviewNoteChange,
  onStatusChange,
  onComment,
  onInternalNote,
  onReviewReopen,
}) {
  const isClosed = ticket.status === "closed";
  const pendingReopens = (ticket.reopenRequests || []).filter((request) => request.status === "pending");

  return (
    <article className="ticket-detail-card">
      <div className="ticket-card-header">
        <div>
          <span className="ticket-id">{shortId(ticket._id)}</span>
          <h3>{ticket.title}</h3>
          <p>{ticket.description}</p>
        </div>
        <span className="status-pill">{ticket.status}</span>
      </div>

      <div className="ticket-meta">
        <span>Customer: {ticket.customerId?.email || "-"}</span>
        <span>Project: {ticket.projectId?.name || "-"}</span>
        <span>Priority: {ticket.priority}</span>
        <span>Agent: {ticket.assignedTo?.email || "Unassigned"}</span>
        <span>Team: {ticket.assignedTeam || "-"}</span>
        <span>SLA: {slaStatus(ticket)}</span>
        <span>Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}</span>
        <span>Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "-"}</span>
        {ticket.completedAt && <span>Completed: {new Date(ticket.completedAt).toLocaleString()}</span>}
        {ticket.closedAt && <span>Closed: {new Date(ticket.closedAt).toLocaleString()}</span>}
      </div>

      <div className="ticket-actions">
        <select
          className="table-select"
          disabled={busy || isClosed}
          value={ticket.status === "resolved" ? "completed" : ticket.status}
          onChange={(e) => onStatusChange(ticket._id, e.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {pendingReopens.length > 0 && (
        <section className="detail-section">
          <h4>Reopen requests</h4>
          {pendingReopens.map((request) => {
            const key = `${ticket._id}:${request._id}`;
            return (
              <div className="comment-item" key={request._id}>
                <strong>{request.requestedBy?.email || "Customer"}</strong>
                <span>{request.reason}</span>
                <div className="comment-form reopen-form">
                  <input
                    value={reviewNotes[key] || ""}
                    onChange={(e) => onReviewNoteChange(key, e.target.value)}
                    placeholder="Admin review note"
                  />
                  <button className="btn-primary inline-button" type="button" disabled={busy} onClick={() => onReviewReopen(ticket._id, request._id, "approved")}>Approve</button>
                  <button className="btn-danger" type="button" disabled={busy} onClick={() => onReviewReopen(ticket._id, request._id, "rejected")}>Reject</button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="detail-section">
        <h4>Customer conversation</h4>
        {(ticket.comments || []).length === 0 ? (
          <p>{isClosed ? "Closed conversation is read-only." : "No conversation yet."}</p>
        ) : (
          ticket.comments.map((item) => (
            <div className="comment-item" key={item._id || item.createdAt}>
              <strong>{item.authorId?.email || item.authorId?.name || "User"}</strong>
              <span>{item.body}</span>
            </div>
          ))
        )}
        {!isClosed && (
          <div className="comment-form">
            <input value={comment} onChange={(e) => onCommentChange(e.target.value)} placeholder="Reply to customer" />
            <button className="btn-primary inline-button" type="button" disabled={busy} onClick={() => onComment(ticket._id)}>Reply</button>
          </div>
        )}
      </section>

      <section className="detail-section internal-note-list">
        <h4>Internal notes</h4>
        {(ticket.internalNotes || []).length === 0 ? (
          <p>No internal notes yet.</p>
        ) : (
          ticket.internalNotes.map((item) => (
            <div className="comment-item" key={item._id || item.createdAt}>
              <strong>{item.authorId?.email || item.authorId?.name || "Team note"}</strong>
              <span>{item.body}</span>
            </div>
          ))
        )}
        {!isClosed && (
          <div className="comment-form">
            <input value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Add admin/agent-only note" />
            <button className="btn-secondary inline-button" type="button" disabled={busy} onClick={() => onInternalNote(ticket._id)}>Internal note</button>
          </div>
        )}
      </section>

      <section className="detail-section">
        <h4>Activity history</h4>
        <div className="activity-list">
          {(ticket.activity || []).slice().reverse().map((item) => (
            <div key={item._id || item.createdAt}>
              <strong>{item.action.replaceAll("_", " ")}</strong>
              <span>{item.actorId?.email || item.actorId?.name || "System"}</span>
              <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</span>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function summaryCards(summary = {}) {
  return [
    ["Total Tickets", "total", Ticket, "violet"],
    ["Open", "open", BellRing, "blue"],
    ["Assigned", "assigned", UserRoundCheck, "amber"],
    ["In Progress", "inProgress", CircleGauge, "purple"],
    ["Reopen Requests", "reopenRequests", BellRing, "red"],
  ].map(([label, key, icon, tone]) => ({ label, value: summary[key] || 0, icon, tone }));
}

function topOpenOrganizations(organizations) {
  return organizations
    .filter((item) => item.counts.open > 0)
    .slice()
    .sort((a, b) => b.counts.open - a.counts.open)
    .slice(0, 5);
}

function orgCode(id) {
  return `ORG-${String(id).slice(-3).toUpperCase()}`;
}

function titleCase(value = "") {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}

function countForTab(tickets, tab) {
  return tickets.filter((ticket) => tab.statuses.includes(ticket.status)).length;
}

function firstAvailableTab(tickets = []) {
  return tabs.find((tab) => countForTab(tickets, tab) > 0)?.key || "open";
}

function tabForStatus(status) {
  if (["open", "triaged"].includes(status)) return "open";
  if (status === "resolved") return "completed";
  return status;
}

function shortId(id) {
  return `T-${String(id).slice(-6).toUpperCase()}`;
}

function slaStatus(ticket) {
  if (!ticket.dueDate) return "No SLA";
  if (ticket.status === "closed") return "Closed";

  const due = new Date(ticket.dueDate).getTime();
  const now = Date.now();
  if (Number.isNaN(due)) return "No SLA";
  if (due < now) return "Overdue";
  if (due - now < 24 * 60 * 60 * 1000) return "Due soon";
  return "On track";
}

function slaClass(ticket) {
  const status = slaStatus(ticket).toLowerCase().replaceAll(" ", "-");
  return `sla-pill ${status}`;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function replaceTicketInOverview(overview, updatedTicket) {
  if (!overview) return overview;

  const organizations = overview.organizations.map((item) => {
    if (String(item.organization._id) !== String(updatedTicket.organizationId)) {
      return item;
    }

    return {
      ...item,
      tickets: item.tickets.map((ticket) =>
        ticket._id === updatedTicket._id ? updatedTicket : ticket
      ),
    };
  });

  return { ...overview, organizations };
}
