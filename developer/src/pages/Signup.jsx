import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-mark">:3003</div>
        <h1 className="auth-title">Create your organization</h1>

        {error && <div className="form-error">{error}</div>}

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

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={update("password")}
            autoComplete="new-password"
          />
        </div>

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create organization"}
        </button>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
