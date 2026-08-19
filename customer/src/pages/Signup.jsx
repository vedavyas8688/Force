import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: "",
    name: "",
    email: "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      if (otpPending) {
        await verifyOtp(form.email, otp);
        navigate("/");
        return;
      }

      const result = await signup({ ...form, role: "customer" });
      if (result?.requiresOtp) {
        setOtpPending(true);
        setNotice(result.devOtp || "");
        return;
      }

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function resetSignup() {
    setOtpPending(false);
    setOtp("");
    setNotice("");
    setError("");
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-mark">:3001</div>
        <h1 className="auth-title">Create customer account</h1>

        {notice && (
          <div className="form-success">
            <span>{notice}</span>
          </div>
        )}
        {error && <div className="form-error">{error}</div>}

        {!otpPending ? (
          <>
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
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" disabled value={form.email} />
            </div>

            <div className="field">
              <label htmlFor="otp">Email OTP</label>
              <input
                id="otp"
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
              />
            </div>
          </>
        )}

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Please wait..." : otpPending ? "Verify OTP" : "Create account"}
        </button>

        {otpPending && (
          <button className="btn-secondary" type="button" onClick={resetSignup} disabled={busy}>
            Edit details
          </button>
        )}

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
