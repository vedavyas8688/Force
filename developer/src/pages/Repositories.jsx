export default function Repositories() {
  return (
    <>
      <h1 className="page-title">Repositories</h1>
      <p className="page-subtitle">Project repository access for developers will be enabled after admin-side repository mapping is complete.</p>
      <div className="panel">
        <div className="empty-state coming-soon-state">
          <div className="id-tag">COMING-SOON</div>
          <h2>Repository workspace coming soon</h2>
          <p>Developers will see assigned project repositories, branches, commits, and pull request context here once the Git workflow is fully connected.</p>
        </div>
      </div>
    </>
  );
}
