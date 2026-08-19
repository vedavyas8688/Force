import { useEffect, useState } from "react";
import { usersApi } from "../api/client";

const initialForm = { name: "", email: "", role: "developer" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setError("");
    try {
      const data = await usersApi.list();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function update(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }));
  }

  async function handleInvite(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      await usersApi.invite(form);
      setNotice("Invite sent to email");
      setForm(initialForm);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(user) {
    const ok = window.confirm(`Remove ${user.email} from this organization?`);
    if (!ok) return;

    setError("");
    setNotice("");
    try {
      await usersApi.remove(user._id);
      setNotice("User removed");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1 className="page-title">Users</h1>
      <p className="page-subtitle">Invite developers and customers into your organization.</p>

      <div className="panel stack-panel">
        <form className="inline-form" onSubmit={handleInvite}>
          <div className="field compact-field">
            <label htmlFor="name">Name</label>
            <input id="name" required value={form.name} onChange={update("name")} />
          </div>

          <div className="field compact-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={form.email} onChange={update("email")} />
          </div>

          <div className="field compact-field">
            <label htmlFor="role">Role</label>
            <select id="role" value={form.role} onChange={update("role")}>
              <option value="developer">Developer</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <button className="btn-primary inline-button" type="submit" disabled={busy}>
            {busy ? "Inviting..." : "Invite"}
          </button>
        </form>

        {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
        {error && <div className="form-error table-notice">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5">No users yet.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className="role-pill">{user.role}</span></td>
                                        <td><span className="status-pill">{user.status}</span></td>
                    <td className="row-actions">
                      {user.role !== "admin" && (
                        <button className="btn-danger" type="button" onClick={() => handleRemove(user)}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


