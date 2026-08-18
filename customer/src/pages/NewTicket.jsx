import { useState } from "react";

export default function NewTicket() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    // Wire this up to POST /api/tickets once the tickets module exists.
    alert("Ticket submission isn't wired to the backend yet.");
  }

  return (
    <>
      <h1 className="page-title">New ticket</h1>
      <p className="page-subtitle">Describe the problem — the more detail, the faster AI can investigate it.</p>
      <form className="panel" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="description">What happened?</label>
          <textarea
            id="description"
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid var(--border)", borderRadius: 6, fontFamily: "inherit" }}
          />
        </div>
        <button className="btn-primary" type="submit" style={{ width: "auto", padding: "10px 20px" }}>
          Submit ticket
        </button>
      </form>
    </>
  );
}
