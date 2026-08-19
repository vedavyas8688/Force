import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usersApi } from "../api/client";
import { DataTable, DataTablePanel, TablePagination } from "../components/ui/DataTable";

const initialForm = { name: "", email: "", role: "developer" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredUsers.length);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, roleFilter, search, statusFilter]);

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

        <div className="table-controls">
          <label className="toolbar-search users-search">
            <Search size={15} />
            <input
              placeholder="Search users..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            className="toolbar-select"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="developer">Developer</option>
            <option value="customer">Customer</option>
          </select>
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <DataTablePanel>
          <DataTable className="users-table" columns={["Name", "Email", "Role", "Status", "Action"]}>
            {loading ? (
              <div className="empty-state"><div className="id-tag">LOADING</div><p>Loading users...</p></div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state"><div className="id-tag">NO-USERS</div><p>No users match this filter.</p></div>
            ) : (
              visibleUsers.map((user) => (
                <div className="data-grid-row users-table-row" key={user._id}>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                  <span><span className="role-pill">{user.role}</span></span>
                  <span><span className="status-pill">{user.status}</span></span>
                  <span className="row-actions">
                    {user.role !== "admin" && (
                      <button className="btn-danger icon-text-button" type="button" onClick={() => handleRemove(user)}>
                        Remove
                      </button>
                    )}
                  </span>
                </div>
              ))
            )}
          </DataTable>
          <TablePagination
            start={pageStart}
            end={pageEnd}
            total={filteredUsers.length}
            label="users"
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </DataTablePanel>
      </div>
    </>
  );
}


