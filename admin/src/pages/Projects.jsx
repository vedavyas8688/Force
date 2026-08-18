export default function Projects() {
  return (
    <>
      <h1 className="page-title">Projects</h1>
      <p className="page-subtitle">Each project can connect one or more Git repositories.</p>
      <div className="panel">
        <div className="empty-state">
          <div className="id-tag">NO-PROJECTS</div>
          <p>Create your first project to start connecting repositories and tracking tickets.</p>
        </div>
      </div>
    </>
  );
}
