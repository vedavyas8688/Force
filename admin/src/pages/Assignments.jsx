import { useEffect, useMemo, useState } from "react";
import { organizationApi, ticketsApi, usersApi } from "../api/client";
import { DataTable, DataTablePanel } from "../components/ui/DataTable";

const strategies = [
  { value: "round_robin", label: "Round robin" },
  { value: "least_load", label: "Least load" },
  { value: "random", label: "Random" },
  { value: "first_available", label: "First available" },
];

export default function Assignments() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [defaultStrategy, setDefaultStrategy] = useState("round_robin");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyTicketId, setBusyTicketId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const developers = useMemo(
    () => users.filter((user) => user.role === "developer" && user.status === "active"),
    [users]
  );
  const assignableTickets = useMemo(
    () => tickets.filter((ticket) => !["completed", "resolved", "closed"].includes(ticket.status)),
    [tickets]
  );
  const unassignedCount = assignableTickets.filter((ticket) => !ticket.assignedTo).length;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setError("");
    try {
      const [ticketData, userData, settingsData] = await Promise.all([
        ticketsApi.list(),
        usersApi.list(),
        organizationApi.settings(),
      ]);
      setTickets(ticketData.tickets || []);
      setUsers(userData.users || []);
      setDefaultStrategy(settingsData.assignmentSettings?.defaultStrategy || "round_robin");
    } catch (err) {
      setError(err.message);
    }
  }

  async function assignManual(ticketId, developerId) {
    if (!developerId) return;
    await assignWithAction(ticketId, () => ticketsApi.assign(ticketId, developerId));
  }

  async function assignWithAction(ticketId, action) {
    setBusyTicketId(ticketId);
    setError("");
    setNotice("");
    try {
      await action();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTicketId("");
    }
  }

  async function assignAllUnassigned() {
    setBulkBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await ticketsApi.autoAssignAll();
      setNotice(`${data.assignedCount} ticket${data.assignedCount === 1 ? "" : "s"} assigned`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Assignments</h1>
      <p className="page-subtitle">Assign active tickets manually, or run the saved strategy for unassigned tickets.</p>
      <div className="panel stack-panel">
        <div className="assignment-toolbar">
          <div className="field compact-field">
            <label htmlFor="bulkStrategy">Saved default strategy</label>
            <input id="bulkStrategy" value={strategies.find((strategy) => strategy.value === defaultStrategy)?.label || defaultStrategy} disabled />
          </div>
          <button
            className="btn-primary inline-button"
            type="button"
            disabled={bulkBusy || unassignedCount === 0 || developers.length === 0}
            onClick={assignAllUnassigned}
          >
            {bulkBusy ? "Assigning..." : `Assign ${unassignedCount} unassigned`}
          </button>
        </div>

        {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
        {error && <div className="form-error table-notice">{error}</div>}

        <DataTablePanel>
          <DataTable className="assignments-table" columns={["Ticket", "Status", "Current Developer", "Manual Assignment"]}>
            {assignableTickets.length === 0 ? (
              <div className="empty-state"><div className="id-tag">NO-ACTIVE</div><p>No active tickets need assignment.</p></div>
            ) : assignableTickets.map((ticket) => (
              <div className="data-grid-row assignments-table-row" key={ticket._id}>
                <strong>{ticket.title}</strong>
                <span><span className="status-pill">{ticket.status}</span></span>
                <span>{ticket.assignedTo?.email || "Unassigned"}</span>
                <select
                  className="table-select"
                  disabled={busyTicketId === ticket._id || developers.length === 0}
                  value={ticket.assignedTo?._id || ""}
                  onChange={(e) => assignManual(ticket._id, e.target.value)}
                >
                  <option value="">{developers.length ? "Choose developer" : "No active developers"}</option>
                  {developers.map((developer) => (
                    <option key={developer._id} value={developer._id}>{developer.name} - {developer.email}</option>
                  ))}
                </select>
              </div>
            ))}
          </DataTable>
        </DataTablePanel>
      </div>
    </>
  );
}

