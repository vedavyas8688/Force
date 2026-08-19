import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/client";

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    otp: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => {
      const value = field === "otp" ? e.target.value.replace(/\D/g, "") : e.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { res, data } = await authApi.acceptInvite(form);
      if (!res.ok) throw new Error(data?.error || "Invite failed");
      navigate("/login");
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
        <h1 className="auth-title">Accept developer invite</h1>

        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={form.email} onChange={update("email")} />
        </div>

        <div className="field">
          <label htmlFor="otp">Invite OTP</label>
          <input id="otp" required inputMode="numeric" maxLength={6} value={form.otp} onChange={update("otp")} />
        </div>

        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" type="password" required minLength={8} value={form.password} onChange={update("password")} />
        </div>

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Activating..." : "Activate account"}
        </button>

        <div className="auth-switch">
          Already active? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}

