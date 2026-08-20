import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      if (otpPending) {
        await verifyOtp(email, otp);
        navigate("/");
        return;
      }

      const result = await login(email, password);
      if (result?.requiresOtp) {
        setOtpPending(true);
        setDevOtp(result.devOtp || "");
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

  function resetLogin() {
    setOtpPending(false);
    setOtp("");
    setNotice("");
    setDevOtp("");
    setError("");
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-mark">:3003</div>
        <h1 className="auth-title">Developer Portal</h1>

        {notice && (
          <div className="form-success">
            <span>{notice}</span>
          </div>
        )}
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            disabled={otpPending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        {!otpPending ? (
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        ) : (
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
        )}

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Please wait..." : otpPending ? "Verify OTP" : "Sign in"}
        </button>

        {otpPending && (
          <button className="btn-secondary" type="button" onClick={resetLogin} disabled={busy}>
            Use different email
          </button>
        )}

        <div className="auth-switch">Access is created by your organization admin.</div>
      </form>
    </div>
  );
}


