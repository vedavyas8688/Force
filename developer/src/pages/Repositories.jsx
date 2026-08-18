export default function Repositories() {
  return (
    <>
      <h1 className="page-title">Repositories</h1>
      <p className="page-subtitle">Repositories you have access to across your assigned projects.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">NO-REPOS</div>
          <p>No repositories available yet.</p>
        </div>
      </div>
    </>
  );
}
