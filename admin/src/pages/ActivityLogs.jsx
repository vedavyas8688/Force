import {
  BellRing,
  CheckCircle2,
  FilePlus2,
  LockKeyhole,
  RefreshCcw,
  RotateCcw,
  Search,
  Sparkles,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ticketsApi } from "../api/client";
import { DataTable, DataTablePanel, TablePagination } from "../components/ui/DataTable";

const pageSizeOptions = [10, 20, 50];
const hiddenActivityActions = new Set(["agent_replied", "customer_replied", "internal_note_added"]);

export default function ActivityLogs() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setError("");
    try {
      const data = await ticketsApi.list();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    }
  }

  const logs = useMemo(() => {
    const rows = [];

    for (const ticket of tickets) {
      for (const item of ticket.activity || []) {
        if (hiddenActivityActions.has(item.action)) continue;

        rows.push({
          id: item._id || `${ticket._id}-${item.createdAt}-${item.action}`,
          ticket,
          action: item.action || "activity",
          actor: item.actorId?.email || item.actorId?.name || "System",
          message: item.message || "-",
          createdAt: item.createdAt,
        });
      }
    }

    return rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [tickets]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((item) =>
      [
        item.action,
        item.actor,
        item.message,
        item.ticket?.title,
        item.ticket?.customerId?.email,
        item.ticket?.projectId?.name,
        shortId(item.ticket?._id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [logs, search]);

  const totalPages = Math.max(Math.ceil(filteredLogs.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  function changePageSize(value) {
    setPageSize(value);
    setPage(1);
  }

  return (
    <section className="activity-page">
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">Track ticket creation, assignment, status changes, AI runs, closure, and reopen decisions.</p>
        </div>
      </div>

      {error && <div className="form-error table-notice">{error}</div>}

      <div className="activity-toolbar">
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search activity..."
        />
      </div>

      <DataTablePanel>
        <DataTable className="activity-log-table" columns={["Action", "Ticket", "Actor", "Message", "Time"]}>
          {pageLogs.map((item) => {
            const config = activityConfig(item.action);
            const Icon = config.icon;

            return (
              <div className="data-grid-row activity-log-row" key={item.id}>
                <span className={`activity-action-pill ${config.tone}`}>
                  <Icon size={14} />
                  {config.label}
                </span>
                <div>
                  <strong>{item.ticket?.title || "Untitled ticket"}</strong>
                  <small>{shortId(item.ticket?._id)} / {item.ticket?.projectId?.name || "No project"}</small>
                </div>
                <span>{item.actor}</span>
                <span className="activity-message">{item.message}</span>
                <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</span>
              </div>
            );
          })}
        </DataTable>
        {pageLogs.length === 0 && (
          <div className="empty-state">
            <div className="id-tag">NO-ACTIVITY</div>
            <p>No activity found for this organization.</p>
          </div>
        )}
        <TablePagination
          start={filteredLogs.length ? startIndex + 1 : 0}
          end={Math.min(startIndex + pageSize, filteredLogs.length)}
          total={filteredLogs.length}
          label="logs"
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      </DataTablePanel>
    </section>
  );
}

function shortId(id = "") {
  return `T-${String(id).slice(-6).toUpperCase()}`;
}

function titleCase(value = "") {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function activityConfig(action = "") {
  const config = {
    ticket_created: { icon: FilePlus2, tone: "blue", label: "Ticket Created" },
    assigned: { icon: UserRoundCheck, tone: "amber", label: "Assigned" },
    status_changed: { icon: RefreshCcw, tone: "purple", label: "Status Changed" },
    completed: { icon: CheckCircle2, tone: "green", label: "Completed" },
    closed: { icon: LockKeyhole, tone: "slate", label: "Closed" },
    reopen_requested: { icon: BellRing, tone: "red", label: "Reopen Requested" },
    reopen_approved: { icon: RotateCcw, tone: "purple", label: "Reopen Approved" },
    reopen_rejected: { icon: XCircle, tone: "red", label: "Reopen Rejected" },
    ai_analysis_created: { icon: Sparkles, tone: "purple", label: "AI Analysis" },
  };

  return config[action] || { icon: Sparkles, tone: "slate", label: titleCase(action) || "Activity" };
}
