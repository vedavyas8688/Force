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

const statusActions = [
  { status: "in_progress", label: "Start work" },
  { status: "pending_customer", label: "Need customer" },
  { status: "completed", label: "Mark completed" },
  { status: "closed", label: "Close ticket" },
];

export default function Assigned() {
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("assigned");
  const [commentByTicket, setCommentByTicket] = useState({});
  const [noteByTicket, setNoteByTicket] = useState({});
  const [error, setError] = useState("");
  const [busyTicketId, setBusyTicketId] = useState("");

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
    if (!status) return;
    setBusyTicketId(ticketId);
    setError("");
    try {
      const data = await ticketsApi.updateStatus(ticketId, status);
      setTickets((current) =>
        current.map((ticket) => (ticket._id === ticketId ? data.ticket : ticket))
      );
      if (status === "completed") setActiveTab("completed");
      if (status === "closed") setActiveTab("closed");
      if (status === "pending_customer") setActiveTab("pending_customer");
      if (status === "in_progress") setActiveTab("in_progress");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTicketId("");
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

  async function addInternalNote(ticketId) {
    const body = (noteByTicket[ticketId] || "").trim();
    if (!body) return;

    setBusyTicketId(ticketId);
    setError("");
    try {
      const data = await ticketsApi.addInternalNote(ticketId, body);
      setTickets((current) =>
        current.map((ticket) => (ticket._id === ticketId ? data.ticket : ticket))
      );
      setNoteByTicket((current) => ({ ...current, [ticketId]: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTicketId("");
    }
  }

  return (
    <>
      <h1 className="page-title">Assigned tickets</h1>
      <p className="page-subtitle">Work your queue, complete tickets, and close finished work.</p>
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
            <div className="id-tag">QUEUE-EMPTY</div>
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
                    <span>Customer: {ticket.customerId?.email || "-"}</span>
                    <span>Priority: {ticket.priority}</span>
                    <span>Team: {ticket.assignedTeam || "-"}</span>
                    <span>Due: {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "-"}</span>
                    <span>Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}</span>
                    <span>Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "-"}</span>
                    {ticket.completedAt && <span>Completed: {new Date(ticket.completedAt).toLocaleString()}</span>}
                    {ticket.closedAt && <span>Closed: {new Date(ticket.closedAt).toLocaleString()}</span>}
                  </div>
                  {!isClosed && (
                    <div className="status-action-row">
                      {statusActions.map((action) => (
                        <button
                          className="btn-secondary compact-action"
                          type="button"
                          key={action.status}
                          disabled={
                            busyTicketId === ticket._id ||
                            ticket.status === action.status ||
                            (action.status === "closed" && !["completed", "resolved"].includes(ticket.status))
                          }
                          onClick={() => updateStatus(ticket._id, action.status)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {!isClosed && (
                    <div className="comment-form">
                      <input
                        value={noteByTicket[ticket._id] || ""}
                        onChange={(e) =>
                          setNoteByTicket((current) => ({ ...current, [ticket._id]: e.target.value }))
                        }
                        placeholder="Add internal note"
                      />
                      <button
                        className="btn-secondary inline-button"
                        type="button"
                        disabled={busyTicketId === ticket._id}
                        onClick={() => addInternalNote(ticket._id)}
                      >
                        Internal note
                      </button>
                    </div>
                  )}
                  {(ticket.internalNotes || []).length > 0 && (
                    <div className="comment-list internal-note-list">
                      {ticket.internalNotes.map((note) => (
                        <div className="comment-item" key={note._id || note.createdAt}>
                          <strong>{note.authorId?.name || note.authorId?.email || "Team note"}</strong>
                          <span>{note.body}</span>
                        </div>
                      ))}
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
                        placeholder="Add progress note"
                      />
                      <button
                        className="btn-primary inline-button"
                        type="button"
                        disabled={busyTicketId === ticket._id}
                        onClick={() => addComment(ticket._id)}
                      >
                        Comment
                      </button>
                    </div>
                  )}
                  {(ticket.activity || []).length > 0 && (
                    <div className="activity-list">
                      {ticket.activity.slice().reverse().map((item) => (
                        <div key={item._id || item.createdAt}>
                          <strong>{item.action.replaceAll("_", " ")}</strong>
                          <span>{item.actorId?.email || item.actorId?.name || "System"}</span>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</span>
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
