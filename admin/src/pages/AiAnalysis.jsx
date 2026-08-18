export default function AiAnalysis() {
  return (
    <>
      <h1 className="page-title">AI analysis</h1>
      <p className="page-subtitle">Root-cause diagnoses generated from tickets, code, Git history and logs.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">AI-IDLE</div>
          <p>Nothing to review yet. Once a ticket is submitted, AI analysis will appear here for your review.</p>
        </div>
      </div>
    </>
  );
}
