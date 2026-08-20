import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/client";

export default function Signup() {
  const [form, setForm] = useState({
    organizationName: "",
    name: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const { res, data } = await authApi.signup(form);
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setNotice(data?.message || "Request submitted. You will receive an email after approval.");
      setForm({ organizationName: "", name: "", email: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-mark">:3002</div>
        <h1 className="auth-title">Request organization access</h1>
        <p className="auth-copy">
          A Super Admin will approve the request. After approval, an invite email will let you set your password.
        </p>

        {error && <div className="form-error">{error}</div>}
        {notice && <div className="form-success">{notice}</div>}

        <div className="field">
          <label htmlFor="organizationName">Organization name</label>
          <input
            id="organizationName"
            required
            value={form.organizationName}
            onChange={update("organizationName")}
          />
        </div>

        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" required value={form.name} onChange={update("name")} />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            autoComplete="email"
          />
        </div>

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Submitting..." : "Submit request"}
        </button>

        <div className="auth-switch">
          Already approved? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
