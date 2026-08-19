import { useEffect, useMemo, useState } from "react";
import { ticketsApi } from "../api/client";

const tabs = [
  { key: "open", label: "Open", statuses: ["open", "triaged"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned", "in_progress"] },
  { key: "completed", label: "Completed", statuses: ["resolved"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
  { key: "all", label: "All", statuses: null },
];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("open");
  const [commentByTicket, setCommentByTicket] = useState({});
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

  async function addComment(ticketId) {
    const body = (commentByTicket[ticketId] || "").trim();
    if (!body) return;

    setBusyTicketId(ticketId);
    setError("");
    try {
      const data = await ticketsApi.addComment(ticketId, body);
      setTickets((current) =>
        current.map((ticket) => (ticket._id === ticketId ? data.ticket : ticket))
      );
      setCommentByTicket((current) => ({ ...current, [ticketId]: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTicketId("");
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
                  </div>
                  {(ticket.status === "resolved" || isClosed) && (
                    <div className="status-action-row">
                      {ticket.status === "resolved" && (
                        <button
                          className="btn-primary compact-action"
                          type="button"
                          disabled={busyTicketId === ticket._id}
                          onClick={() => updateStatus(ticket._id, "closed")}
                        >
                          Close ticket
                        </button>
                      )}
                      <button
                        className="btn-secondary compact-action"
                        type="button"
                        disabled={busyTicketId === ticket._id}
                        onClick={() => updateStatus(ticket._id, "open")}
                      >
                        Reopen
                      </button>
                    </div>
                  )}
                  <div className="comment-list">
                    {(ticket.comments || []).length === 0 ? (
                      <p>{isClosed ? "Closed with no comments." : "No comments yet."}</p>
                    ) : (
                      ticket.comments.map((comment) => (
                        <div className="comment-item" key={comment._id || comment.createdAt}>
                          <strong>{comment.authorId?.name || comment.authorId?.email || "User"}</strong>
                          <span>{comment.body}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {!isClosed && (
                    <div className="comment-form">
                      <input
                        value={commentByTicket[ticket._id] || ""}
                        onChange={(e) =>
                          setCommentByTicket((current) => ({ ...current, [ticket._id]: e.target.value }))
                        }
                        placeholder="Add a reply"
                      />
                      <button
                        className="btn-primary inline-button"
                        type="button"
                        disabled={busyTicketId === ticket._id}
                        onClick={() => addComment(ticket._id)}
                      >
                        Reply
                      </button>
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
