import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi, ticketsApi } from "../api/client";

const initialForm = { projectId: "", title: "", description: "", priority: "medium", dueDate: "" };

export default function NewTicket() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await ticketsApi.create(form);
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
        <button className="btn-primary form-button" type="submit" disabled={busy || projects.length === 0}>
          {busy ? "Submitting..." : "Submit ticket"}
        </button>
      </form>
    </>
  );
}
