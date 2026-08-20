import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ticketsApi } from "../api/client";

const statusActions = [
  { status: "in_progress", label: "Start work", icon: "play" },
  { status: "pending_customer", label: "Need customer", icon: "user" },
  { status: "completed", label: "Mark completed", icon: "check" },
  { status: "closed", label: "Close ticket", icon: "lock" },
];

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTicket();
  }, [id]);

  async function loadTicket() {
    setError("");
    try {
      const data = await ticketsApi.get(id);
      setTicket(data.ticket);
    } catch (err) {
      setError(err.message);
    }
  }

  async function runAction(action) {
    setBusy(true);
    setError("");
    try {
      const data = await action();
      setTicket(data.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!ticket) {
    return (
      <>
        <Link className="back-button" to="/assigned"><Icon name="arrowLeft" /> Back to tickets</Link>
        {error ? <div className="form-error table-notice">{error}</div> : <div className="empty-state">Loading ticket...</div>}
      </>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <section className="ticket-page">
      <Link className="back-button" to="/assigned"><Icon name="arrowLeft" /> Back to tickets</Link>
      {error && <div className="form-error table-notice">{error}</div>}

      <article className="ticket-detail-card">
        <div className="ticket-card-header">
          <div>
            <span className="ticket-id">{shortId(ticket._id)}</span>
            <h1>{ticket.title}</h1>
            <p>{ticket.description}</p>
          </div>
          <span className="status-pill">{formatStatus(ticket.status)}</span>
        </div>

        <div className="ticket-detail-summary">
          <div><span>Project</span><strong>{ticket.projectId?.name || "-"}</strong></div>
          <div><span>Customer</span><strong>{ticket.customerId?.email || "-"}</strong></div>
          <div><span>Priority</span><strong>{formatStatus(ticket.priority)}</strong></div>
          <div><span>SLA</span><strong>{slaStatus(ticket)}</strong></div>
        </div>

        <AttachmentList attachments={ticket.attachments} onPreview={setPreviewAttachment} />

        {!isClosed && (
          <div className="ticket-action-strip">
            {statusActions.map((action) => {
              return (
                <button
                  className="btn-secondary inline-button"
                  type="button"
                  key={action.status}
                  disabled={
                    busy ||
                    ticket.status === action.status ||
                    (action.status === "closed" && !["completed", "resolved"].includes(ticket.status))
                  }
                  onClick={() => runAction(() => ticketsApi.updateStatus(ticket._id, action.status))}
                >
                  <Icon name={action.icon} /> {action.label}
                </button>
              );
            })}
            <button className="btn-secondary inline-button" type="button" disabled={busy} onClick={() => runAction(() => ticketsApi.analyze(ticket._id))}>
              <Icon name="bot" /> Run AI analysis
            </button>
          </div>
        )}

        <AiAnalysisPanel analysis={ticket.aiAnalysis} />
        <TicketActivityTimeline activity={ticket.activity} />
      </article>

      {previewAttachment && (
        <div className="attachment-preview-backdrop" role="presentation" onClick={() => setPreviewAttachment(null)}>
          <div className="attachment-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="attachment-preview-close" type="button" onClick={() => setPreviewAttachment(null)}>
              <Icon name="x" />
            </button>
            <img src={previewAttachment.dataUrl} alt={previewAttachment.name} />
            <div>
              <strong>{previewAttachment.name}</strong>
              <a href={previewAttachment.dataUrl} download={previewAttachment.name}>Download</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AttachmentList({ attachments = [], onPreview }) {
  if (!attachments.length) return null;

  return (
    <section className="detail-section attachment-list">
      <h4>Attachments</h4>
      <div>
        {attachments.map((attachment, index) => {
          const isImage = attachment.type?.startsWith("image/");
          const iconName = isImage ? "eye" : "file";
          const content = (
            <>
              <Icon name={iconName} />
              {attachment.name}
            </>
          );

          return isImage ? (
            <button className="attachment-chip" type="button" key={`${attachment.name}-${index}`} onClick={() => onPreview(attachment)}>
              {content}
            </button>
          ) : (
            <a href={attachment.dataUrl || undefined} download={attachment.name} className="attachment-chip" key={`${attachment.name}-${index}`}>
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function AiAnalysisPanel({ analysis }) {
  if (!analysis || analysis.status === "not_started") return null;

  const sections = Array.isArray(analysis.sections)
    ? analysis.sections.filter((section) => section?.title || section?.body || section?.items?.length || section?.code)
    : [];

  return (
    <section className="detail-section ai-analysis-panel">
      <div className="ai-section-header">
        <div>
          <h4>{analysis.title || "AI Debug Analysis"}</h4>
          {analysis.summary && <p>{analysis.summary}</p>}
        </div>
        <span className={`status-pill ai-status-${analysis.status}`}>{formatStatus(analysis.status)}</span>
      </div>

      {sections.length > 0 && (
        <div className="ai-analysis-document">
          {sections.map((section, index) => (
            <article className="ai-analysis-section" key={`${section.title || "section"}-${index}`}>
              {section.title && <h5>{section.title}</h5>}
              {section.body && <p>{section.body}</p>}
              {section.items?.length > 0 && (
                <ul>
                  {section.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
                </ul>
              )}
              {section.code && <pre><code>{section.code}</code></pre>}
            </article>
          ))}
        </div>
      )}

      <div className="ai-analysis-footer">
        {analysis.provider && <span>{analysis.provider}{analysis.model ? ` / ${analysis.model}` : ""}</span>}
        {Number(analysis.confidence) > 0 && <span>{Math.round(Number(analysis.confidence) * 100)}% confidence</span>}
        {analysis.analyzedAt && <span>{new Date(analysis.analyzedAt).toLocaleString()}</span>}
      </div>
      {analysis.error && <p className="ai-error">{analysis.error}</p>}
    </section>
  );
}

function TicketActivityTimeline({ activity = [] }) {
  const visibleActivity = (activity || [])
    .filter((item) => !["agent_replied", "customer_replied", "internal_note_added"].includes(item.action))
    .slice()
    .reverse();

  if (visibleActivity.length === 0) return null;

  return (
    <section className="detail-section ticket-activity-timeline">
      <h4>Ticket Activity</h4>
      <div className="timeline-list">
        {visibleActivity.map((item) => (
          <div className="timeline-item" key={item._id || item.createdAt}>
            <span className="timeline-dot" />
            <div>
              <strong>{activityTitle(item)}</strong>
              <p>{activityMessage(item)}</p>
              <time><Icon name="clock" /> {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</time>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function shortId(id) {
  return `T-${String(id).slice(-6).toUpperCase()}`;
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

function activityTitle(item) {
  const titles = {
    ticket_created: "Ticket created",
    assigned: "Developer assigned",
    status_changed: "Status changed",
    completed: "Ticket completed",
    closed: "Ticket closed",
    reopen_requested: "Reopen requested",
    reopen_approved: "Reopen approved",
    reopen_rejected: "Reopen rejected",
  };

  return titles[item.action] || formatStatus(item.action);
}

function activityMessage(item) {
  if (item.fromStatus || item.toStatus) {
    return `${formatStatus(item.fromStatus || "-")} -> ${formatStatus(item.toStatus || "-")}`;
  }
  return item.message || activityTitle(item);
}

function formatStatus(status = "") {
  return status.replaceAll("_", " ");
}

function Icon({ name }) {
  const paths = {
    arrowLeft: "M19 12H5m7 7-7-7 7-7",
    bot: "M12 8V4m-5 7h10m-8 4h.01M15 15h.01M6 20h12a2 2 0 0 0 2-2v-7a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v7a2 2 0 0 0 2 2Z",
    check: "m5 12 4 4L19 6",
    clock: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6",
    lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6V11Z",
    play: "M8 5v14l11-7L8 5Z",
    user: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    x: "m18 6-12 12M6 6l12 12",
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
