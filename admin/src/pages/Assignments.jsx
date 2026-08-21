import { useEffect, useMemo, useState } from "react";
import { organizationApi, ticketsApi, usersApi } from "../api/client";
import { DataTable, DataTablePanel } from "../components/ui/DataTable";

const strategies = [
  { value: "manual", label: "Manual" },
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
  const [reviewBusyId, setReviewBusyId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedDevelopers, setSelectedDevelopers] = useState({});

  const developers = useMemo(
    () => users.filter((user) => user.role === "developer" && user.status === "active"),
    [users]
  );
  const assignableTickets = useMemo(
    () => tickets.filter((ticket) => ["open", "triaged", "assigned", "in_progress"].includes(ticket.status)),
    [tickets]
  );
  const pendingReopenTickets = useMemo(
    () => tickets
      .map((ticket) => ({
        ticket,
        request: (ticket.reopenRequests || []).find((request) => request.status === "pending"),
      }))
      .filter((item) => item.request),
    [tickets]
  );
  const unassignedCount = assignableTickets.filter((ticket) => !ticket.assignedTo).length;
  const selectedAssignmentCount = Object.values(selectedDevelopers).filter(Boolean).length;

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
    const assigned = await assignWithAction(ticketId, () => ticketsApi.assign(ticketId, developerId));
    if (!assigned) return;
    const developer = developers.find((user) => user._id === developerId);
    setNotice(`Ticket assigned to ${developer?.name || "the selected developer"}`);
    setSelectedDevelopers((current) => {
      const next = { ...current };
      delete next[ticketId];
      return next;
    });
  }

  function selectDeveloper(ticketId, developerId) {
    setSelectedDevelopers((current) => ({ ...current, [ticketId]: developerId }));
  }

  async function assignWithAction(ticketId, action) {
    setBusyTicketId(ticketId);
    setError("");
    setNotice("");
    try {
      await action();
      await loadData();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusyTicketId("");
    }
  }

  async function assignAllUnassigned() {
    if (defaultStrategy === "manual") {
      const assignments = Object.entries(selectedDevelopers).filter(([, developerId]) => developerId);
      if (assignments.length === 0) {
        setError("Choose a developer for at least one ticket before assigning.");
        return;
      }

      setBulkBusy(true);
      setError("");
      setNotice("");
      try {
        await Promise.all(assignments.map(([ticketId, developerId]) => ticketsApi.assign(ticketId, developerId)));
        setNotice(`${assignments.length} ticket${assignments.length === 1 ? "" : "s"} assigned`);
        setSelectedDevelopers({});
        await loadData();
      } catch (err) {
        setError(err.message);
      } finally {
        setBulkBusy(false);
      }
      return;
    }
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

  async function reviewReopen(ticketId, requestId, decision) {
    setReviewBusyId(requestId);
    setError("");
    setNotice("");
    try {
      await ticketsApi.reviewReopenRequest(ticketId, requestId, decision);
      setNotice(decision === "approved" ? "Reopen request approved" : "Reopen request rejected");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewBusyId("");
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
            disabled={bulkBusy || developers.length === 0 || (defaultStrategy === "manual" ? selectedAssignmentCount === 0 : unassignedCount === 0)}
            onClick={assignAllUnassigned}
          >
            {bulkBusy ? "Assigning..." : defaultStrategy === "manual" ? `Assign tickets below${selectedAssignmentCount ? ` (${selectedAssignmentCount})` : ""}` : `Assign ${unassignedCount} unassigned`}
          </button>
        </div>

        {notice && <div className="form-success table-notice"><span>{notice}</span></div>}
        {error && <div className="form-error table-notice">{error}</div>}

        {pendingReopenTickets.length > 0 && (
          <section className="assignment-reopen-panel">
            <div>
              <h2>Reopen Requests</h2>
              <p>Review customer requests before a closed ticket becomes active again.</p>
            </div>
            <DataTablePanel>
              <DataTable className="assignment-reopen-table" columns={["Ticket", "Customer", "Reason", "Current Developer", "Action"]}>
                {pendingReopenTickets.map(({ ticket, request }) => (
                  <div className="data-grid-row assignment-reopen-row" key={request._id}>
                    <strong>{ticket.title}</strong>
                    <span>{ticket.customerId?.email || "-"}</span>
                    <span>{request.reason}</span>
                    <span>{ticket.assignedTo?.email || "Unassigned"}</span>
                    <div className="row-actions">
                      <button
                        className="btn-secondary inline-button"
                        type="button"
                        disabled={reviewBusyId === request._id}
                        onClick={() => reviewReopen(ticket._id, request._id, "rejected")}
                      >
                        Reject
                      </button>
                      <button
                        className="btn-primary inline-button"
                        type="button"
                        disabled={reviewBusyId === request._id}
                        onClick={() => reviewReopen(ticket._id, request._id, "approved")}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </DataTable>
            </DataTablePanel>
          </section>
        )}

        <DataTablePanel>
          <DataTable className="assignments-table" columns={["Ticket", "Status", "Current Developer", "Manual Assignment"]}>
            {assignableTickets.length === 0 ? (
              <div className="empty-state"><div className="id-tag">NO-ACTIVE</div><p>No active tickets need assignment.</p></div>
            ) : assignableTickets.map((ticket) => (
              <div className="data-grid-row assignments-table-row" key={ticket._id}>
                <strong>{ticket.title}</strong>
                <span><span className="status-pill">{ticket.status}</span></span>
                <span>{ticket.assignedTo?.email || "Unassigned"}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="table-select"
                    disabled={busyTicketId === ticket._id || bulkBusy || developers.length === 0}
                    value={selectedDevelopers[ticket._id] || ""}
                    onChange={(e) => selectDeveloper(ticket._id, e.target.value)}
                  >
                    <option value="">{developers.length ? "Choose developer" : "No active developers"}</option>
                    {developers.map((developer) => (
                      <option key={developer._id} value={developer._id}>{developer.name} - {developer.email}</option>
                    ))}
                  </select>
                  <button
                    className="btn-primary inline-button"
                    type="button"
                    disabled={busyTicketId === ticket._id || bulkBusy || !selectedDevelopers[ticket._id]}
                    onClick={() => assignManual(ticket._id, selectedDevelopers[ticket._id])}
                  >
                    {busyTicketId === ticket._id ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </div>
            ))}
          </DataTable>
        </DataTablePanel>
      </div>
    </>
  );
}

