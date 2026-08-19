import { CheckCircle2, GitBranch, RefreshCw, Save, Search, Unlink, Webhook } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { githubApi, projectsApi } from "../api/client";
import { DataTable, DataTablePanel } from "../components/ui/DataTable";
import { MetricGrid } from "../components/ui/MetricGrid";

export default function GitSettings() {
  const [projects, setProjects] = useState([]);
  const [githubStatus, setGithubStatus] = useState(null);
  const [installations, setInstallations] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [selectedInstallationId, setSelectedInstallationId] = useState("");
  const [manualInstallationId, setManualInstallationId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyProjectId, setBusyProjectId] = useState("");
  const [busyInstall, setBusyInstall] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (selectedInstallationId) {
      loadRepositories(selectedInstallationId);
    } else {
      setRepositories([]);
    }
  }, [selectedInstallationId]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const connected = Boolean(project.repository?.fullName);
      const matchesFilter =
        filter === "all" ||
        (filter === "connected" && connected) ||
        (filter === "not_connected" && !connected);
      const matchesSearch =
        !query ||
        project.name?.toLowerCase().includes(query) ||
        project.repository?.fullName?.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, projects, search]);

  const connectedProjects = projects.filter((project) => project.repository?.fullName);
  const syncedProjects = projects.filter((project) => project.repository?.syncStatus === "synced");

  async function initializePage() {
    await saveCallbackInstallation();
    await loadPage();
  }

  async function loadPage() {
    setError("");
    try {
      const [projectData, statusData] = await Promise.all([
        projectsApi.list(),
        githubApi.status(),
      ]);
      const nextProjects = projectData.projects || [];
      const nextInstallations = statusData.installations || [];

      setProjects(nextProjects);
      setGithubStatus(statusData.status);
      setInstallations(nextInstallations);
      setSelectedInstallationId(String(nextInstallations[0]?.installationId || ""));
      setDrafts(
        Object.fromEntries(
          nextProjects.map((project) => [
            project._id,
            {
              fullName: project.repository?.fullName || "",
              defaultBranch: project.repository?.defaultBranch || "main",
              installationId: String(project.repository?.installationId || nextInstallations[0]?.installationId || ""),
            },
          ])
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveCallbackInstallation() {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get("installation_id");
    if (!installationId) return;

    try {
      await githubApi.saveInstallation(installationId);
      setNotice("GitHub installation saved");
      window.history.replaceState({}, "", "/git-settings");
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadRepositories(installationId) {
    setError("");
    try {
      const data = await githubApi.repositories(installationId);
      setRepositories(data.repositories || []);
    } catch (err) {
      setRepositories([]);
      setError(err.message);
    }
  }

  function updateDraft(projectId, field, value) {
    setDrafts((current) => ({
      ...current,
      [projectId]: {
        ...(current[projectId] || { fullName: "", defaultBranch: "main", installationId: selectedInstallationId }),
        [field]: value,
      },
    }));
  }

  async function saveManualInstallation() {
    const installationId = manualInstallationId.trim();
    if (!installationId) return;

    setBusyInstall(true);
    setError("");
    setNotice("");
    try {
      await githubApi.saveInstallation(installationId);
      setManualInstallationId("");
      setNotice("GitHub installation saved");
      await loadPage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyInstall(false);
    }
  }

  async function connectRepository(projectId) {
    const draft = drafts[projectId] || {};
    const fullName = draft.fullName.trim();
    const installationId = draft.installationId || selectedInstallationId;

    if (!installationId) {
      setError("Connect a GitHub App installation first");
      return;
    }

    if (!fullName) {
      setError("Choose a repository");
      return;
    }

    setBusyProjectId(projectId);
    setNotice("");
    setError("");
    try {
      await githubApi.connectProjectRepository(projectId, {
        installationId,
        fullName,
        defaultBranch: draft.defaultBranch || "main",
      });
      setNotice("Repository connected and sync started");
      await loadPage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyProjectId("");
    }
  }

  async function disconnectRepository(projectId) {
    setBusyProjectId(projectId);
    setNotice("");
    setError("");
    try {
      await githubApi.disconnectProjectRepository(projectId);
      setNotice("Repository disconnected");
      await loadPage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyProjectId("");
    }
  }

  return (
    <>
      <h1 className="page-title">Git Settings</h1>
      <p className="page-subtitle">Install the GitHub App, choose an installed repository, and map it to a project.</p>

      <MetricGrid
        className="git-metric-strip"
        items={[
          { label: "Total Projects", value: projects.length, icon: GitBranch, tone: "violet" },
          { label: "Connected", value: connectedProjects.length, icon: CheckCircle2, tone: "green" },
          { label: "Synced", value: syncedProjects.length, icon: RefreshCw, tone: "blue" },
          { label: "Installations", value: installations.length, icon: Webhook, tone: "amber" },
        ]}
      />

      <div className="panel stack-panel">
        <div className="github-install-bar">
          <div>
            <strong>GitHub App</strong>
            <span>{githubStatus?.configured ? "App credentials loaded" : "Missing App ID or private key"}</span>
            {githubStatus?.missingConfig?.length > 0 && (
              <small>Missing: {githubStatus.missingConfig.join(", ")}</small>
            )}
          </div>
          {githubStatus?.installUrl ? (
            <a className="btn-primary inline-button" href={githubStatus.installUrl}>
              Install GitHub App
            </a>
          ) : (
            <span className="id-tag">Add GITHUB_APP_SLUG for install link</span>
          )}
          <input
            className="table-input"
            placeholder="installation_id"
            value={manualInstallationId}
            onChange={(event) => setManualInstallationId(event.target.value)}
          />
          <button className="btn-secondary inline-button" type="button" disabled={busyInstall} onClick={saveManualInstallation}>
            Save Installation
          </button>
        </div>

        <div className="table-controls">
          <label className="toolbar-search users-search">
            <Search size={15} />
            <input
              placeholder="Search projects or repos..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select className="toolbar-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All Projects</option>
            <option value="connected">Connected</option>
            <option value="not_connected">Not Connected</option>
          </select>
          <select className="toolbar-select" value={selectedInstallationId} onChange={(event) => setSelectedInstallationId(event.target.value)}>
            <option value="">Choose installation</option>
            {installations.map((installation) => (
              <option key={installation.installationId} value={installation.installationId}>
                {installation.githubAccountLogin} - {installation.installationId}
              </option>
            ))}
          </select>
        </div>

        {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
        {error && <div className="form-error table-notice">{error}</div>}

        <DataTablePanel>
          <DataTable
            className="git-project-table"
            columns={["Project", "Repository", "Branch", "Sync Status", "Action"]}
          >
            {filteredProjects.length === 0 ? (
              <div className="empty-state">
                <div className="id-tag">NO-PROJECTS</div>
                <p>No projects match this filter.</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const draft = drafts[project._id] || {
                  fullName: "",
                  defaultBranch: "main",
                  installationId: selectedInstallationId,
                };
                const connected = Boolean(project.repository?.fullName);
                const busy = busyProjectId === project._id;

                return (
                  <div className="data-grid-row git-project-row" key={project._id}>
                    <div>
                      <strong>{project.name}</strong>
                      <small>{project.description || "No description"}</small>
                    </div>
                    <select
                      className="table-select"
                      value={draft.fullName}
                      onChange={(event) => {
                        const repo = repositories.find((item) => item.fullName === event.target.value);
                        updateDraft(project._id, "fullName", event.target.value);
                        updateDraft(project._id, "defaultBranch", repo?.defaultBranch || "main");
                        updateDraft(project._id, "installationId", selectedInstallationId);
                      }}
                    >
                      <option value="">{repositories.length ? "Choose repository" : "No repositories loaded"}</option>
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.fullName}>{repo.fullName}</option>
                      ))}
                      {draft.fullName && !repositories.some((repo) => repo.fullName === draft.fullName) && (
                        <option value={draft.fullName}>{draft.fullName}</option>
                      )}
                    </select>
                    <input
                      className="table-input"
                      value={draft.defaultBranch}
                      onChange={(event) => updateDraft(project._id, "defaultBranch", event.target.value)}
                    />
                    <span>
                      <span className={connected ? "status-pill connected" : "status-pill"}>
                        {project.repository?.syncStatus || (connected ? "connected" : "not connected")}
                      </span>
                      {project.repository?.syncError && <small>{project.repository.syncError}</small>}
                    </span>
                    <span className="row-actions">
                      <button
                        className="btn-primary icon-text-button"
                        type="button"
                        disabled={busy || !selectedInstallationId || !draft.fullName}
                        onClick={() => connectRepository(project._id)}
                      >
                        <Save size={15} />
                        {busy ? "Saving" : "Connect"}
                      </button>
                      {connected && (
                        <button className="btn-danger icon-text-button" type="button" disabled={busy} onClick={() => disconnectRepository(project._id)}>
                          <Unlink size={15} />
                          Disconnect
                        </button>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </DataTable>
        </DataTablePanel>
      </div>
    </>
  );
}
