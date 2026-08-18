export default function Commits() {
  return (
    <>
      <h1 className="page-title">Commits</h1>
      <p className="page-subtitle">Recent commits AI has correlated with reported regressions.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">NO-COMMITS</div>
          <p>No regression correlations yet.</p>
        </div>
      </div>
    </>
  );
}
