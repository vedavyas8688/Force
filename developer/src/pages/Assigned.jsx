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

  async function analyzeTicket(ticketId) {
    setBusyTicketId(ticketId);
    setError("");
    try {
      const data = await ticketsApi.analyze(ticketId);
      setTickets((current) =>
        current.map((ticket) => (ticket._id === ticketId ? data.ticket : ticket))
      );
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
                  <AttachmentList attachments={ticket.attachments} />
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
                      <button
                        className="btn-secondary compact-action"
                        type="button"
                        disabled={busyTicketId === ticket._id}
                        onClick={() => analyzeTicket(ticket._id)}
                      >
                        Run AI analysis
                      </button>
                    </div>
                  )}
                  <AiAnalysisPanel analysis={ticket.aiAnalysis} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function AiAnalysisPanel({ analysis }) {
  if (!analysis || analysis.status === "not_started") {
    return (
      <section className="ai-analysis-panel">
        <div className="ai-section-header">
          <h4>AI debug analysis</h4>
          <span className="status-pill">not started</span>
        </div>
        <p>No AI analysis yet.</p>
      </section>
    );
  }

  const sections = displaySections(analysis);

  return (
    <section className="ai-analysis-panel">
      <div className="ai-section-header">
        <div>
          <h4>{analysis.title || "AI debug analysis"}</h4>
          {analysis.summary && <p>{analysis.summary}</p>}
        </div>
        <span className={`status-pill ai-status-${analysis.status}`}>{analysis.status}</span>
      </div>

      <div className="ai-analysis-document">
        {sections.map((section, index) => (
          <article className="ai-analysis-section" key={`${section.title}-${index}`}>
            {section.title && <h5>{section.title}</h5>}
            {section.body && <p>{section.body}</p>}
            {section.items?.length > 0 && (
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={`${section.title}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            )}
            {section.code && <pre><code>{section.code}</code></pre>}
          </article>
        ))}
      </div>

      <div className="ai-analysis-footer">
        {analysis.provider && <span>{analysis.provider}{analysis.model ? ` / ${analysis.model}` : ""}</span>}
        {Number.isFinite(Number(analysis.confidence)) && Number(analysis.confidence) > 0 && (
          <span>{Math.round(Number(analysis.confidence) * 100)}%</span>
        )}
        {analysis.analyzedAt && <span>{new Date(analysis.analyzedAt).toLocaleString()}</span>}
      </div>
      {analysis.error && <p className="ai-error">{analysis.error}</p>}
    </section>
  );
}

function displaySections(analysis) {
  if (Array.isArray(analysis.sections) && analysis.sections.length > 0) {
    return analysis.sections.filter((section) =>
      section?.title || section?.body || section?.code || section?.items?.length
    );
  }

  return [
    analysis.problem && { title: "Problem", body: analysis.problem, items: [] },
    analysis.likelyRootCause && { title: "Likely root cause", body: analysis.likelyRootCause, items: [] },
    analysis.developerBrief && { title: "Developer brief", body: analysis.developerBrief, items: [] },
    analysis.investigationSteps?.length && { title: "Investigation steps", body: "", items: analysis.investigationSteps },
    analysis.suggestedFixes?.length && { title: "Suggested fixes", body: "", items: analysis.suggestedFixes },
    analysis.validationSteps?.length && { title: "Validation steps", body: "", items: analysis.validationSteps },
    analysis.suspectedFiles?.length && {
      title: "Suspected files",
      body: "",
      items: analysis.suspectedFiles.map((file) =>
        `${file.path || "Unknown file"}${file.lineStart || file.lineEnd ? ` lines ${file.lineStart || "?"}-${file.lineEnd || file.lineStart || "?"}` : ""}${file.reason ? ` - ${file.reason}` : ""}`
      ),
    },
  ].filter(Boolean);
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
