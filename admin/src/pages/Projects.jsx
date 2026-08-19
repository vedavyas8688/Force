import { useEffect, useState } from "react";
import { projectsApi } from "../api/client";

const initialForm = { name: "", description: "" };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const data = await projectsApi.list();
      setProjects(data.projects || []);
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
      await projectsApi.create(form);
      setForm(initialForm);
      await loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Projects</h1>
      <p className="page-subtitle">Create projects before customers report tickets.</p>
      <div className="panel stack-panel">
        <form className="inline-form project-form" onSubmit={handleSubmit}>
          <div className="field compact-field">
            <label htmlFor="name">Project name</label>
            <input id="name" required value={form.name} onChange={update("name")} />
          </div>
          <div className="field compact-field">
            <label htmlFor="description">Description</label>
            <input id="description" value={form.description} onChange={update("description")} />
          </div>
          <button className="btn-primary inline-button" disabled={busy}>{busy ? "Creating..." : "Create"}</button>
        </form>
        {error && <div className="form-error table-notice">{error}</div>}
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Description</th><th>Status</th></tr></thead>
            <tbody>
              {projects.length === 0 ? <tr><td colSpan="3">No projects yet.</td></tr> : projects.map((project) => (
                <tr key={project._id}><td>{project.name}</td><td>{project.description || "-"}</td><td><span className="status-pill">{project.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
