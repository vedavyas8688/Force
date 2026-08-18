export default function Assignments() {
  return (
    <>
      <h1 className="page-title">Assignments</h1>
      <p className="page-subtitle">Route reviewed tickets to a developer.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">NO-ASSIGNMENTS</div>
          <p>Nothing waiting on assignment right now.</p>
        </div>
      </div>
    </>
  );
}
