import { useEffect, useMemo, useState } from "react";
import { ticketsApi } from "../api/client";

const tabs = [
  { key: "all", label: "All", statuses: null },
  { key: "open", label: "Open", statuses: ["open", "triaged"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { key: "completed", label: "Completed", statuses: ["completed", "resolved"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [reopenReasonByTicket, setReopenReasonByTicket] = useState({});
  const [busyTicketId, setBusyTicketId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const tab = tabs.find((item) => item.key === activeTab);
    const sortedTickets = [...tickets].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
    if (!tab?.statuses) return sortedTickets;
    return sortedTickets.filter((ticket) => tab.statuses.includes(ticket.status));
  }, [activeTab, tickets]);

  function countForTab(tab) {
    if (!tab.statuses) return tickets.length;
    return tickets.filter((ticket) => tab.statuses.includes(ticket.status)).length;
  }

  async function loadTickets() {
    setError("");
    setSuccess("");
    try {
      const data = await ticketsApi.list();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(ticketId, status) {
    setBusyTicketId(ticketId);
    setError("");
    try {
      const data = await ticketsApi.updateStatus(ticketId, status);
      setTickets((current) =>
        current.map((ticket) => (ticket._id === ticketId ? data.ticket : ticket))
      );
      setSuccess(status === "closed" ? "Ticket closed." : "Ticket updated.");
      setActiveTab(status === "closed" ? "closed" : "open");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTicketId("");
    }
  }

  async function requestReopen(ticketId) {
    const reason = (reopenReasonByTicket[ticketId] || "").trim();
    if (!reason) {
      setError("Please enter a reason before requesting reopen");
      return;
    }

    setBusyTicketId(ticketId);
    setError("");
    setSuccess("");
    try {
      const data = await ticketsApi.requestReopen(ticketId, reason);
      setTickets((current) =>
        current.map((ticket) => (ticket._id === ticketId ? data.ticket : ticket))
      );
      setReopenReasonByTicket((current) => ({ ...current, [ticketId]: "" }));
      setSuccess("Reopen request sent. Admin will review it.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTicketId("");
    }
  }

  return (
    <>
      <h1 className="page-title">My tickets</h1>
      <p className="page-subtitle">Review completed tickets, close fixed work, or reopen issues that still need help.</p>
      <div className="panel stack-panel">
        <div className="ticket-tabs">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.key ? "ticket-tab active" : "ticket-tab"}
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span>{countForTab(tab)}</span>
            </button>
          ))}
        </div>

        {error && <div className="form-error table-notice">{error}</div>}
        {success && <div className="form-success table-notice"><span>{success}</span></div>}
        {filteredTickets.length === 0 ? (
          <div className="empty-state">
            <div className="id-tag">NO-TICKETS</div>
            <p>No tickets in this tab.</p>
          </div>
        ) : (
          <div className="ticket-list">
            {filteredTickets.map((ticket, index) => {
              const isClosed = ticket.status === "closed";
              const hasPendingReopen = (ticket.reopenRequests || []).some((request) => request.status === "pending");
              return (
                <article className="ticket-card" key={ticket._id}>
                  <div className="ticket-card-header">
                    <div>
                      <span className="ticket-sequence">#{index + 1}</span>
                      <h3>{ticket.title}</h3>
                      <p>{ticket.description}</p>
                    </div>
                    <span className="status-pill">{formatStatus(ticket.status)}</span>
                  </div>
                  <div className="ticket-meta">
                    <span>Project: {ticket.projectId?.name || "-"}</span>
                    <span>Developer: {ticket.assignedTo?.email || "Unassigned"}</span>
                    <span>Priority: {formatStatus(ticket.priority)}</span>
                    <span>Due: {formatDate(ticket.dueDate)}</span>
                    <span>Created: {formatDateTime(ticket.createdAt)}</span>
                    <span>Updated: {formatDateTime(ticket.updatedAt)}</span>
                    {ticket.completedAt && <span>Completed: {formatDateTime(ticket.completedAt)}</span>}
                    {ticket.closedAt && <span>Closed: {formatDateTime(ticket.closedAt)}</span>}
                  </div>
                  <AttachmentList attachments={ticket.attachments} />
                  {(["completed", "resolved"].includes(ticket.status) || isClosed) && (
                    <div className="status-action-row">
                      {["completed", "resolved"].includes(ticket.status) && (
                        <button
                          className="btn-primary compact-action"
                          type="button"
                          disabled={busyTicketId === ticket._id}
                          onClick={() => updateStatus(ticket._id, "closed")}
                        >
                          {busyTicketId === ticket._id ? "Closing..." : "Close ticket"}
                        </button>
                      )}
                    </div>
                  )}
                  {isClosed && !hasPendingReopen && (
                    <div className="reopen-box">
                      <div>
                        <strong>Need more help?</strong>
                        <span>Send a reopen request with a short reason. Admin will review it before the ticket becomes active again.</span>
                      </div>
                      <div className="reopen-form">
                        <input
                          value={reopenReasonByTicket[ticket._id] || ""}
                          onChange={(e) =>
                            setReopenReasonByTicket((current) => ({ ...current, [ticket._id]: e.target.value }))
                          }
                          placeholder="Reason to request reopen"
                        />
                        <button
                          className="btn-secondary inline-button"
                          type="button"
                          disabled={busyTicketId === ticket._id}
                          onClick={() => requestReopen(ticket._id)}
                        >
                          {busyTicketId === ticket._id ? "Sending..." : "Request reopen"}
                        </button>
                      </div>
                    </div>
                  )}
                  {(ticket.reopenRequests || []).length > 0 && (
                    <div className="reopen-history">
                      {(ticket.reopenRequests || []).map((request) => (
                        <div className={`reopen-history-item ${request.status}`} key={request._id || request.createdAt}>
                          <div>
                            <strong>Reopen request</strong>
                            <span>{request.reason}</span>
                            {request.adminNote && <small>{request.adminNote}</small>}
                          </div>
                          <em>{request.status}</em>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return null;

  return (
    <div className="attachment-list">
      <strong>Attachments</strong>
      <div>
        {attachments.map((attachment, index) => (
          <a
            href={attachment.dataUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className={attachment.dataUrl ? "attachment-chip" : "attachment-chip disabled"}
            key={`${attachment.name}-${index}`}
            aria-disabled={!attachment.dataUrl}
            onClick={(event) => {
              if (!attachment.dataUrl) event.preventDefault();
            }}
          >
            {attachment.type?.startsWith("image/") ? "Image" : "File"}: {attachment.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function formatStatus(value = "") {
  return String(value || "-").replaceAll("_", " ");
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "-";
}
