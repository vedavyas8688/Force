import { FolderKanban, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { projectsApi } from "../api/client";
import { DataTable, DataTablePanel, TablePagination } from "../components/ui/DataTable";

const initialForm = { name: "", description: "" };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { loadProjects(); }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.name?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.repository?.fullName?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredProjects.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredProjects.length);
  const visibleProjects = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search, statusFilter]);

  async function loadProjects() {
    setError("");
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
    setNotice("");
    setBusy(true);
    try {
      await projectsApi.create(form);
      setNotice("Project created");
      setForm(initialForm);
      await loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(project) {
    const ok = window.confirm(`Delete ${project.name}? Projects with tickets cannot be deleted.`);
    if (!ok) return;

    setDeletingId(project._id);
    setError("");
    setNotice("");
    try {
      await projectsApi.remove(project._id);
      setNotice("Project deleted");
      await loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
      <h1 className="page-title">Projects</h1>
      <p className="page-subtitle">Create projects, connect repositories, and keep ticket history scoped correctly.</p>

      <div className="panel stack-panel">
        <form className="inline-form project-form clean-project-form" onSubmit={handleSubmit}>
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

        {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
        {error && <div className="form-error table-notice">{error}</div>}

        <div className="table-controls">
          <label className="toolbar-search users-search">
            <Search size={15} />
            <input
              placeholder="Search projects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <DataTablePanel>
          <DataTable
            className="project-table"
            columns={["Project", "Repository", "Status", "Created", "Action"]}
          >
            {visibleProjects.length === 0 ? (
              <div className="empty-state">
                <div className="id-tag">NO-PROJECTS</div>
                <p>No projects match this filter.</p>
              </div>
            ) : (
              visibleProjects.map((project) => (
                <div className="data-grid-row project-table-row" key={project._id}>
                  <div className="project-name-cell">
                    <span className="project-icon"><FolderKanban size={18} /></span>
                    <div>
                      <strong>{project.name}</strong>
                      <small>{project.description || "No description"}</small>
                    </div>
                  </div>
                  <span>{project.repository?.fullName || "Not connected"}</span>
                  <span><span className="status-pill">{project.status}</span></span>
                  <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "-"}</span>
                  <span className="row-actions">
                    <button
                      className="btn-danger icon-text-button"
                      type="button"
                      disabled={deletingId === project._id}
                      onClick={() => handleDelete(project)}
                    >
                      <Trash2 size={15} />
                      {deletingId === project._id ? "Deleting" : "Delete"}
                    </button>
                  </span>
                </div>
              ))
            )}
          </DataTable>
          <TablePagination
            start={pageStart}
            end={pageEnd}
            total={filteredProjects.length}
            label="projects"
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </DataTablePanel>
      </div>
    </>
  );
}
