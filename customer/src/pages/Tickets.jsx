import { useEffect, useMemo, useState } from "react";
import { ticketsApi } from "../api/client";

const tabs = [
  { key: "open", label: "Open", statuses: ["open", "triaged"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { key: "pending_customer", label: "Pending Customer", statuses: ["pending_customer"] },
  { key: "completed", label: "Completed", statuses: ["completed", "resolved"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("open");
  const [reopenReasonByTicket, setReopenReasonByTicket] = useState({});
  const [busyTicketId, setBusyTicketId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const tab = tabs.find((item) => item.key === activeTab);
    if (!tab?.statuses) return tickets;
    return tickets.filter((ticket) => tab.statuses.includes(ticket.status));
  }, [activeTab, tickets]);

  function countForTab(tab) {
    if (!tab.statuses) return tickets.length;
    return tickets.filter((ticket) => tab.statuses.includes(ticket.status)).length;
  }

  async function loadTickets() {
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
      setActiveTab(status === "closed" ? "closed" : "open");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTicketId("");
    }
  }

  async function requestReopen(ticketId) {
    const reason = (reopenReasonByTicket[ticketId] || "").trim();
    if (!reason) return;

    setBusyTicketId(ticketId);
    setError("");
    try {
      const data = await ticketsApi.requestReopen(ticketId, reason);
      setTickets((current) =>
        current.map((ticket) => (ticket._id === ticketId ? data.ticket : ticket))
      );
      setReopenReasonByTicket((current) => ({ ...current, [ticketId]: "" }));
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
        {filteredTickets.length === 0 ? (
          <div className="empty-state">
            <div className="id-tag">NO-TICKETS</div>
            <p>No tickets in this tab.</p>
          </div>
        ) : (
          <div className="ticket-list">
            {filteredTickets.map((ticket) => {
              const isClosed = ticket.status === "closed";
              return (
                <article className="ticket-card" key={ticket._id}>
                  <div className="ticket-card-header">
                    <div>
                      <h3>{ticket.title}</h3>
                      <p>{ticket.description}</p>
                    </div>
                    <span className="status-pill">{ticket.status}</span>
                  </div>
                  <div className="ticket-meta">
                    <span>Project: {ticket.projectId?.name || "-"}</span>
                    <span>Developer: {ticket.assignedTo?.email || "Unassigned"}</span>
                    <span>Priority: {ticket.priority}</span>
                    <span>Due: {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "-"}</span>
                    <span>Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}</span>
                    <span>Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "-"}</span>
                    {ticket.completedAt && <span>Completed: {new Date(ticket.completedAt).toLocaleString()}</span>}
                    {ticket.closedAt && <span>Closed: {new Date(ticket.closedAt).toLocaleString()}</span>}
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
                          Close ticket
                        </button>
                      )}
                    </div>
                  )}
                  {isClosed && (
                    <div className="comment-form">
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
                        disabled={
                          busyTicketId === ticket._id ||
                          (ticket.reopenRequests || []).some((request) => request.status === "pending")
                        }
                        onClick={() => requestReopen(ticket._id)}
                      >
                        Request reopen
                      </button>
                    </div>
                  )}
                  {(ticket.reopenRequests || []).length > 0 && (
                    <div className="comment-list">
                      {ticket.reopenRequests.map((request) => (
                        <div className="comment-item" key={request._id || request.createdAt}>
                          <strong>Reopen request: {request.status}</strong>
                          <span>{request.reason}</span>
                          {request.adminNote && <span>{request.adminNote}</span>}
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
            className="attachment-chip"
            key={`${attachment.name}-${index}`}
          >
            {attachment.type?.startsWith("image/") ? "Image" : "File"}: {attachment.name}
          </a>
        ))}
      </div>
    </div>
  );
}
