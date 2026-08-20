import { CheckCircle2, GitBranch, LockKeyhole, RefreshCw, Save, Search, Trash2, Unlink, UnlockKeyhole, Webhook } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { githubApi, projectsApi } from "../api/client";
import { DataTable, DataTablePanel } from "../components/ui/DataTable";
import { MetricGrid } from "../components/ui/MetricGrid";

export default function GitSettings() {
  const [projects, setProjects] = useState([]);
  const [githubStatus, setGithubStatus] = useState(null);
  const [connections, setConnections] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyProjectId, setBusyProjectId] = useState("");
  const [busyInstall, setBusyInstall] = useState(false);
  const [busyConnectionId, setBusyConnectionId] = useState("");
  const [lastGithubAuthUrl, setLastGithubAuthUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (selectedConnectionId) {
      loadRepositories(selectedConnectionId);
    } else {
      setRepositories([]);
    }
  }, [selectedConnectionId]);

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
  const selectedConnection = connections.find((connection) => String(connection._id) === String(selectedConnectionId)) || connections[0];
  const selectedDraftRepos = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(drafts).map(([projectId, draft]) => [
          projectId,
          repositories.find((repo) => repo.fullName === draft.fullName),
        ])
      ),
    [drafts, repositories]
  );

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
      const nextConnections = statusData.connections || [];

      setProjects(nextProjects);
      setGithubStatus(statusData.status);
      setConnections(nextConnections);
      setSelectedConnectionId(String(nextConnections[0]?._id || ""));
      setDrafts(
        Object.fromEntries(
          nextProjects.map((project) => [
            project._id,
            {
              fullName: project.repository?.fullName || "",
              defaultBranch: project.repository?.defaultBranch || "main",
              gitConnectionId: String(project.repository?.gitConnectionId || nextConnections[0]?._id || ""),
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
    const githubResult = params.get("github");
    const githubOAuthResult = params.get("github_oauth");
    const githubError = params.get("github_error");

    if (githubError) {
      setError(githubError);
      window.history.replaceState({}, "", "/integrations");
      return;
    }

    if (githubResult === "connected" || githubOAuthResult === "connected") {
      setNotice("GitHub connected");
      window.history.replaceState({}, "", "/integrations");
      return;
    }

    if (!installationId) return;

    try {
      await githubApi.saveInstallation(installationId);
      setNotice("GitHub installation saved");
      window.history.replaceState({}, "", "/integrations");
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadRepositories(connectionId) {
    setError("");
    try {
      const data = await githubApi.oauthRepositories(connectionId);
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
        ...(current[projectId] || { fullName: "", defaultBranch: "main", gitConnectionId: selectedConnectionId }),
        [field]: value,
      },
    }));
  }

  async function connectRepository(projectId) {
    const draft = drafts[projectId] || {};
    const fullName = draft.fullName.trim();
    const gitConnectionId = draft.gitConnectionId || selectedConnectionId;

    if (!gitConnectionId) {
      setError("Connect GitHub first");
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
      await githubApi.connectProjectOAuthRepository(projectId, {
        gitConnectionId,
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

  async function startGithubConnection() {
    setBusyInstall(true);
    setNotice("");
    setError("");
    setLastGithubAuthUrl("");
    try {
      const data = await githubApi.oauthConnectUrl();
      if (!data?.url) {
        throw new Error("GitHub authorization URL was not returned");
      }
      setLastGithubAuthUrl(data.url);
      window.location.assign(data.url);
      window.setTimeout(() => {
        setBusyInstall(false);
      }, 2500);
    } catch (err) {
      setError(err.message);
      setBusyInstall(false);
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

  async function disconnectGithubConnection() {
    if (!selectedConnection?._id) {
      setError("Choose a GitHub account to remove");
      return;
    }

    const confirmed = window.confirm(
      `Remove GitHub account ${selectedConnection.providerUsername}? This will disconnect GitHub from all projects that use this account.`
    );
    if (!confirmed) return;

    setBusyConnectionId(selectedConnection._id);
    setNotice("");
    setError("");
    try {
      const result = await githubApi.disconnectOAuthConnection(selectedConnection._id);
      setNotice(`GitHub removed from ${result.projectsUpdated || 0} project${result.projectsUpdated === 1 ? "" : "s"}`);
      setSelectedConnectionId("");
      setRepositories([]);
      await loadPage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyConnectionId("");
    }
  }

  return (
    <>
      <h1 className="page-title">Integrations</h1>
      <p className="page-subtitle">Connect organization tools and map repositories to projects.</p>

      <MetricGrid
        className="git-metric-strip"
        items={[
          { label: "Total Projects", value: projects.length, icon: GitBranch, tone: "violet" },
          { label: "Connected", value: connectedProjects.length, icon: CheckCircle2, tone: "green" },
          { label: "Synced", value: syncedProjects.length, icon: RefreshCw, tone: "blue" },
          { label: "GitHub Accounts", value: connections.length, icon: Webhook, tone: "amber" },
        ]}
      />

      <div className="panel stack-panel">
        <div className="github-install-bar">
          <div className="github-connection-copy">
            <span className="github-service-icon"><Webhook size={18} /></span>
            <div>
              <strong>GitHub</strong>
              <span>
                {connections.length > 0
                  ? `Connected to GitHub as ${selectedConnection?.providerUsername || connections[0].providerUsername}`
                  : "Connect GitHub to sync repositories for this organization"}
              </span>
            </div>
          </div>
          <div className="github-actions">
            {githubStatus?.clientId ? (
              <button className="btn-primary inline-button" type="button" disabled={busyInstall} onClick={startGithubConnection}>
                {busyInstall ? "Opening GitHub" : connections.length > 0 ? "Connect another account" : "Connect GitHub"}
              </button>
            ) : (
              <span className="id-tag">GitHub OAuth setup unavailable</span>
            )}
            {connections.length > 0 && (
              <button
                className="btn-danger icon-text-button"
                type="button"
                disabled={Boolean(busyConnectionId)}
                onClick={disconnectGithubConnection}
              >
                <Trash2 size={15} />
                {busyConnectionId ? "Removing" : "Delete"}
              </button>
            )}
          </div>
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
          <select className="toolbar-select" value={selectedConnectionId} onChange={(event) => setSelectedConnectionId(event.target.value)}>
            <option value="">Choose GitHub account</option>
            {connections.map((connection) => (
              <option key={connection._id} value={connection._id}>
                {connection.providerUsername}
              </option>
            ))}
          </select>
        </div>

        {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
        {error && <div className="form-error table-notice">{error}</div>}
        {lastGithubAuthUrl && (
          <div className="form-success table-notice">
            <span>
              Opening GitHub authorization. If it does not open,{" "}
              <a href={lastGithubAuthUrl}>continue to GitHub</a>.
            </span>
          </div>
        )}

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
                  gitConnectionId: selectedConnectionId,
                };
                const selectedRepo = selectedDraftRepos[project._id];
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
                        updateDraft(project._id, "gitConnectionId", selectedConnectionId);
                      }}
                    >
                      <option value="">{repositories.length ? "Choose repository" : "No repositories loaded"}</option>
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.fullName}>
                          {repo.fullName} - {repo.private ? "Private" : "Public"}
                        </option>
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
                      {(selectedRepo || connected) && (
                        <small className={selectedRepo?.private ? "repo-visibility private" : "repo-visibility public"}>
                          {selectedRepo?.private ? <LockKeyhole size={12} /> : <UnlockKeyhole size={12} />}
                          {selectedRepo?.private ? "Private repository" : "Public repository"}
                        </small>
                      )}
                      {project.repository?.syncError && <small>{project.repository.syncError}</small>}
                    </span>
                    <span className="row-actions">
                      <button
                        className="btn-primary icon-text-button"
                        type="button"
                        disabled={busy || !selectedConnectionId || !draft.fullName}
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
