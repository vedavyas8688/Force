import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi, ticketsApi } from "../api/client";

const initialForm = { projectId: "", title: "", description: "", priority: "medium", dueDate: "" };
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 1_500_000;

export default function NewTicket() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const data = await projectsApi.list();
      const active = (data.projects || []).filter((project) => project.status === "active");
      setProjects(active);
      if (active[0]) setForm((current) => ({ ...current, projectId: active[0]._id }));
    } catch (err) {
      setError(err.message);
    }
  }

  function update(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }));
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setError("");

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }

    try {
      const prepared = await Promise.all(files.map(readAttachment));
      setAttachments((current) => [...current, ...prepared]);
    } catch (err) {
      setError(err.message);
    }
  }

  function removeAttachment(index) {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await ticketsApi.create({ ...form, attachments });
      navigate("/tickets");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">New ticket</h1>
      <p className="page-subtitle">Describe the issue and attach it to a project.</p>
      <form className="panel ticket-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="projectId">Project</label>
          <select id="projectId" required value={form.projectId} onChange={update("projectId")}>
            {projects.length === 0 ? <option value="">No projects available</option> : projects.map((project) => (
              <option key={project._id} value={project._id}>{project.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" required value={form.title} onChange={update("title")} />
        </div>
        <div className="field">
          <label htmlFor="description">What happened?</label>
          <textarea id="description" required rows={6} value={form.description} onChange={update("description")} />
        </div>
        <div className="field">
          <label htmlFor="priority">Priority</label>
          <select id="priority" value={form.priority} onChange={update("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dueDate">SLA / due date</label>
          <input id="dueDate" type="date" value={form.dueDate} onChange={update("dueDate")} />
        </div>
        <div className="field">
          <label htmlFor="attachments">Screenshots / files</label>
          <input
            id="attachments"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.log"
            multiple
            onChange={handleFiles}
            disabled={busy || attachments.length >= MAX_ATTACHMENTS}
          />
          <small className="field-hint">Add screenshots or logs. Max {MAX_ATTACHMENTS} files, 1.5 MB each.</small>
        </div>
        {attachments.length > 0 && (
          <div className="attachment-preview-list">
            {attachments.map((attachment, index) => (
              <div className="attachment-preview" key={`${attachment.name}-${index}`}>
                {attachment.type.startsWith("image/") ? (
                  <img src={attachment.dataUrl} alt={attachment.name} />
                ) : (
                  <span className="attachment-file-icon">FILE</span>
                )}
                <div>
                  <strong>{attachment.name}</strong>
                  <small>{attachment.type || "file"} / {formatBytes(attachment.size)}</small>
                </div>
                <button type="button" onClick={() => removeAttachment(index)} disabled={busy}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <button className="btn-primary form-button" type="submit" disabled={busy || projects.length === 0}>
          {busy ? "Submitting..." : "Submit ticket"}
        </button>
      </form>
    </>
  );
}

function readAttachment(file) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return Promise.reject(new Error(`${file.name} is larger than 1.5 MB.`));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: String(reader.result || ""),
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function formatBytes(size) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
