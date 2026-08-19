import { useEffect, useMemo, useState } from "react";
import { organizationApi, ticketsApi, usersApi } from "../api/client";

const strategies = [
  { value: "manual", label: "Manual" },
  { value: "round_robin", label: "Round robin" },
  { value: "least_load", label: "Least load" },
  { value: "random", label: "Random" },
  { value: "first_available", label: "First available" },
];

const autoStrategies = strategies.filter((strategy) => strategy.value !== "manual");

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

  async function assignAuto(ticketId, strategy) {
    if (!strategy) return;
    await assignWithAction(ticketId, () => ticketsApi.autoAssign(ticketId, strategy));
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
      <p className="page-subtitle">Use the saved default strategy, or override one ticket manually.</p>
      <div className="panel stack-panel">
        <div className="assignment-toolbar">
          <div className="field compact-field">
            <label htmlFor="bulkStrategy">Saved default strategy</label>
            <input id="bulkStrategy" value={strategies.find((strategy) => strategy.value === defaultStrategy)?.label || defaultStrategy} disabled />
          </div>
          <button className="btn-primary inline-button" type="button" disabled={bulkBusy} onClick={assignAllUnassigned}>
            {bulkBusy ? "Assigning..." : "Run saved strategy"}
          </button>
        </div>

        {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
        {error && <div className="form-error table-notice">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Ticket</th><th>Status</th><th>Current developer</th><th>Manual</th><th>Auto</th></tr></thead>
            <tbody>
              {tickets.length === 0 ? <tr><td colSpan="5">No tickets available.</td></tr> : tickets.map((ticket) => (
                <tr key={ticket._id}>
                  <td>{ticket.title}</td>
                  <td><span className="status-pill">{ticket.status}</span></td>
                  <td>{ticket.assignedTo?.email || "Unassigned"}</td>
                  <td>
                    <select
                      className="table-select"
                      disabled={busyTicketId === ticket._id || developers.length === 0}
                      defaultValue=""
                      onChange={(e) => assignManual(ticket._id, e.target.value)}
                    >
                      <option value="">{developers.length ? "Choose developer" : "No active developers"}</option>
                      {developers.map((developer) => (
                        <option key={developer._id} value={developer._id}>{developer.name} - {developer.email}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="table-select"
                      disabled={busyTicketId === ticket._id || developers.length === 0}
                      defaultValue=""
                      onChange={(e) => assignAuto(ticket._id, e.target.value)}
                    >
                      <option value="">Strategy</option>
                      {autoStrategies.map((strategy) => (
                        <option key={strategy.value} value={strategy.value}>{strategy.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

