import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ticketsApi } from "../api/client";

const tabs = [
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { key: "pending_customer", label: "Pending Customer", statuses: ["pending_customer"] },
  { key: "completed", label: "Completed", statuses: ["completed", "resolved"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
];

export default function Assigned() {
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("assigned");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const tab = tabs.find((item) => item.key === activeTab);
    return tickets.filter((ticket) => tab.statuses.includes(ticket.status));
  }, [activeTab, tickets]);

  async function loadTickets() {
    setError("");
    try {
      const data = await ticketsApi.list();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    }
  }

  function countForTab(tab) {
    return tickets.filter((ticket) => tab.statuses.includes(ticket.status)).length;
  }

  return (
    <>
      <h1 className="page-title">Assigned Tickets</h1>
      <p className="page-subtitle">Open a ticket to update status, review AI analysis, and inspect attached evidence.</p>

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
          <div className="table-wrap">
            <table className="data-table work-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Project</th>
                  <th>Customer</th>
                  <th>Priority</th>
                  <th>SLA</th>
                  <th>AI</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td><span className="ticket-id">{shortId(ticket._id)}</span></td>
                    <td>
                      <strong>{ticket.title}</strong>
                      <span className="muted-line">{truncate(ticket.description, 80)}</span>
                    </td>
                    <td>{ticket.projectId?.name || "-"}</td>
                    <td>{ticket.customerId?.email || "-"}</td>
                    <td><span className="status-pill">{ticket.priority}</span></td>
                    <td>{slaStatus(ticket)}</td>
                    <td><span className={`status-pill ai-status-${ticket.aiAnalysis?.status || "not_started"}`}>{formatStatus(ticket.aiAnalysis?.status || "not_started")}</span></td>
                    <td>
                      <Link className="row-action-button" to={`/assigned/${ticket._id}`}>
                        <Icon name="eye" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function shortId(id) {
  return `T-${String(id).slice(-6).toUpperCase()}`;
}

function truncate(value = "", max = 80) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function slaStatus(ticket) {
  if (!ticket.dueDate) return "No SLA";
  if (ticket.status === "closed") return "Closed";
  const due = new Date(ticket.dueDate).getTime();
  if (Number.isNaN(due)) return "No SLA";
  if (due < Date.now()) return "Overdue";
  if (due - Date.now() < 24 * 60 * 60 * 1000) return "Due soon";
  return "On track";
}

function formatStatus(status = "") {
  return status.replaceAll("_", " ");
}

function Icon({ name }) {
  const paths = {
    eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
