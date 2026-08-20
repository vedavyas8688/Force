import { ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { platformApi } from "../api/client.js";

const initialForm = {
  organizationName: "",
  adminName: "",
  email: "",
};

export default function Admins() {
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const adminRows = useMemo(() => {
    const rows = [];
    for (const item of overview?.organizations || []) {
      if (item.counts.admins > 0) {
        rows.push(item);
      }
    }
    return rows;
  }, [overview]);

  async function load() {
    try {
      setOverview(await platformApi.overview());
    } catch (err) {
      setError(err.message);
    }
  }

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await platformApi.createOrganizationAdmin(form);
      setNotice(`Invite sent to ${result.admin.email}. They must accept it from email before logging in.`);
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Organization Admins</h1>
        <p>Create the first admin for a customer organization. The admin receives an email invitation before login.</p>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="split-grid admin-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>Add Organization Admin</h2>
            <UserPlus size={18} />
          </div>
          <form className="admin-form" onSubmit={submit}>
            <label>
              Organization name
              <input required value={form.organizationName} onChange={update("organizationName")} />
            </label>
            <label>
              Admin name
              <input required value={form.adminName} onChange={update("adminName")} />
            </label>
            <label>
              Admin email
              <input required type="email" value={form.email} onChange={update("email")} />
            </label>
            <button type="submit" disabled={busy}>{busy ? "Sending..." : "Send admin invite"}</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Admin Coverage</h2>
            <ShieldCheck size={18} />
          </div>
          <div className="health-list">
            {adminRows.map((item) => (
              <div key={item.organization.id}>
                <span>{item.organization.name}</span>
                <strong>{item.counts.admins} admin{item.counts.admins === 1 ? "" : "s"}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
