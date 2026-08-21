import { ArrowLeft, Bot, Eye, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminTicketsApi, ticketsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});

  const ticketApi = user?.role === "super_admin" ? adminTicketsApi : ticketsApi;

  useEffect(() => {
    loadTicket();
  }, [id, user?.role]);

  async function loadTicket() {
    setError("");
    setSuccess("");
    try {
      const data = await ticketApi.get(id);
      setTicket(data.ticket);
    } catch (err) {
      setError(err.message);
    }
  }

  async function runAction(action) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await action();
      setTicket(data.ticket);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function reviewReopenRequest(requestId, decision) {
    const adminNote = reviewNotes[requestId] || "";
    const data = await runAction(() => ticketApi.reviewReopenRequest(ticket._id, requestId, decision, adminNote));
    if (!data) return;
    setReviewNotes((current) => ({ ...current, [requestId]: "" }));
    setSuccess(decision === "approved" ? "Reopen request approved. Ticket is active again." : "Reopen request rejected. Ticket remains closed.");
  }

  async function analyzeTicket() {
    await runAction(() => ticketApi.analyze(id));
  }

  if (!ticket) {
    return (
      <>
        <Link className="back-button" to="/tickets"><ArrowLeft size={16} /> Back to tickets</Link>
        {error ? <div className="form-error table-notice">{error}</div> : <div className="empty-state">Loading ticket...</div>}
      </>
    );
  }

  return (
    <section className="ticket-page">
      <Link className="back-button icon-text-button" to="/tickets"><ArrowLeft size={16} /> Back to tickets</Link>
      {error && <div className="form-error table-notice">{error}</div>}
      {success && <div className="form-success table-notice"><span>{success}</span></div>}

      <article className="ticket-detail-card ticket-detail-page-card">
        <div className="ticket-card-header">
          <div>
            <span className="ticket-id">{shortId(ticket._id)}</span>
            <h1>{ticket.title}</h1>
            <p>{ticket.description}</p>
          </div>
          <span className="status-pill">{ticket.status}</span>
        </div>

        <div className="ticket-detail-summary">
          <div><span>Customer</span><strong>{ticket.customerId?.email || "-"}</strong></div>
          <div><span>Project</span><strong>{ticket.projectId?.name || "-"}</strong></div>
          <div><span>Priority</span><strong>{titleCase(ticket.priority)}</strong></div>
          <div><span>Agent</span><strong>{ticket.assignedTo?.email || "Unassigned"}</strong></div>
          <div><span>SLA</span><strong>{slaStatus(ticket)}</strong></div>
        </div>

        <AttachmentList attachments={ticket.attachments} onPreview={setPreviewAttachment} />

        {user?.role === "admin" && (
          <ReopenReviewPanel
            ticket={ticket}
            busy={busy}
            reviewNotes={reviewNotes}
            onNoteChange={(requestId, value) =>
              setReviewNotes((current) => ({ ...current, [requestId]: value }))
            }
            onReview={reviewReopenRequest}
          />
        )}

        <div className="ticket-action-strip">
          <button className="btn-secondary inline-button icon-text-button" type="button" disabled={busy} onClick={analyzeTicket}>
            <Bot size={16} /> Run AI analysis
          </button>
        </div>

        <AiAnalysisPanel analysis={ticket.aiAnalysis} />

        <TicketActivityTimeline activity={ticket.activity} />
      </article>

      {previewAttachment && (
        <div className="attachment-preview-backdrop" role="presentation" onClick={() => setPreviewAttachment(null)}>
          <div className="attachment-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="attachment-preview-close" type="button" onClick={() => setPreviewAttachment(null)}>
              <X size={18} />
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

function ReopenReviewPanel({ ticket, busy, reviewNotes, onNoteChange, onReview }) {
  const requests = ticket.reopenRequests || [];
  if (!requests.length) return null;

  return (
    <section className="detail-section reopen-review-panel">
      <div className="section-heading-row">
        <h4>Reopen Review</h4>
        <span>{requests.filter((request) => request.status === "pending").length} pending</span>
      </div>
      <div className="reopen-review-list">
        {requests.map((request) => {
          const isPending = request.status === "pending";
          const requestId = request._id || request.id;

          return (
            <article className={`reopen-review-item ${request.status}`} key={requestId || request.createdAt}>
              <div className="reopen-review-copy">
                <strong>{request.requestedBy?.email || "Customer"}</strong>
                <p>{request.reason}</p>
                <small>
                  {request.createdAt ? new Date(request.createdAt).toLocaleString() : ""}
                  {request.reviewedBy?.email ? ` / reviewed by ${request.reviewedBy.email}` : ""}
                </small>
              </div>
              <span className={`status-pill reopen-${request.status}`}>{formatStatus(request.status)}</span>
              {request.adminNote && <p className="review-note">Admin note: {request.adminNote}</p>}
              {isPending && (
                <div className="reopen-review-actions">
                  <input
                    value={reviewNotes[requestId] || ""}
                    onChange={(event) => onNoteChange(requestId, event.target.value)}
                    placeholder="Optional admin note"
                  />
                  <button className="btn-secondary inline-button" type="button" disabled={busy} onClick={() => onReview(requestId, "rejected")}>
                    Reject
                  </button>
                  <button className="btn-primary inline-button" type="button" disabled={busy} onClick={() => onReview(requestId, "approved")}>
                    Approve
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
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
              <time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</time>
            </div>
          </div>
        ))}
      </div>
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

          if (isImage) {
            return (
              <button
                className="attachment-chip"
                type="button"
                key={`${attachment.name}-${index}`}
                onClick={() => onPreview(attachment)}
              >
                <Eye size={14} />
                {attachment.name}
              </button>
            );
          }

          return (
            <a href={attachment.dataUrl || undefined} download={attachment.name} className="attachment-chip" key={`${attachment.name}-${index}`}>
              <FileText size={14} />
              {attachment.name}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function AiAnalysisPanel({ analysis }) {
  if (!analysis || analysis.status === "not_started") {
    return null;
  }

  const sections = displaySections(analysis);
  if (sections.length === 0 && !analysis.error && !analysis.summary) return null;

  return (
    <section className="detail-section ai-analysis-panel">
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

  return titles[item.action] || titleCase(item.action);
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

function titleCase(value = "") {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
