export default function Assigned() {
  return (
    <>
      <h1 className="page-title">Assigned tickets</h1>
      <p className="page-subtitle">Tickets routed to you, with AI-identified files and lines.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">QUEUE-EMPTY</div>
          <p>Nothing assigned to you right now.</p>
        </div>
      </div>
    </>
  );
}
