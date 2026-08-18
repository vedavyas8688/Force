export default function Repositories() {
  return (
    <>
      <h1 className="page-title">Git settings</h1>
      <p className="page-subtitle">Connect GitHub at the project level using least-privilege permissions.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">NOT-CONNECTED</div>
          <p>No repositories connected yet.</p>
        </div>
      </div>
    </>
  );
}
