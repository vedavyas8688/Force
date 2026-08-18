export default function Tickets() {
  return (
    <>
      <h1 className="page-title">Tickets</h1>
      <p className="page-subtitle">All tickets across your organization's projects.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">NO-TICKETS</div>
          <p>No tickets reported yet.</p>
        </div>
      </div>
    </>
  );
}
