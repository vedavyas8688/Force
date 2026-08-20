import { useEffect, useState } from "react";
import { organizationApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

const strategies = [
  { value: "manual", label: "Manual" },
  { value: "round_robin", label: "Round robin" },
  { value: "least_load", label: "Least load" },
  { value: "random", label: "Random" },
  { value: "first_available", label: "First available" },
];

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [defaultStrategy, setDefaultStrategy] = useState("round_robin");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = await organizationApi.settings();
      setSettings(data);
      setDefaultStrategy(data.assignmentSettings?.defaultStrategy || "round_robin");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAssignmentSettings(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await organizationApi.updateAssignmentSettings({ defaultStrategy });
      setNotice("Assignment settings saved");
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Profile information and organization defaults.</p>

      <div className="settings-grid">
        <section className="panel stack-panel">
          <div>
            <h2 className="section-title">Profile information</h2>
            <p className="section-subtitle">Signed-in admin and organization context.</p>
          </div>
          <div className="settings-list">
            <div><span>Name</span><strong>{user?.name || "-"}</strong></div>
            <div><span>Email</span><strong>{user?.email || "-"}</strong></div>
            <div><span>Role</span><strong>{user?.role || "-"}</strong></div>
            <div><span>Organization</span><strong>{settings?.organization?.name || user?.organizationId || "-"}</strong></div>
            <div><span>Plan</span><strong>{settings?.organization?.plan || "-"}</strong></div>
          </div>
        </section>

        <section className="panel stack-panel">
          <div>
            <h2 className="section-title">Assignment settings</h2>
            <p className="section-subtitle">This default is used when assigning tickets in bulk or with saved strategy.</p>
          </div>
          <form className="settings-form" onSubmit={saveAssignmentSettings}>
            <div className="field compact-field">
              <label htmlFor="defaultStrategy">Default assignment strategy</label>
              <select id="defaultStrategy" value={defaultStrategy} onChange={(e) => setDefaultStrategy(e.target.value)}>
                {strategies.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>{strategy.label}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary inline-button" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </button>
          </form>
          {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
          {error && <div className="form-error table-notice">{error}</div>}
        </section>
      </div>
    </>
  );
}
