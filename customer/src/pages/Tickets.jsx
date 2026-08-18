export default function Tickets() {
  return (
    <>
      <h1 className="page-title">My tickets</h1>
      <p className="page-subtitle">Everything you've reported, and its current status.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">NO-TICKETS</div>
          <p>Nothing here yet. Tickets you create will show up in this list with their status.</p>
        </div>
      </div>
    </>
  );
}
