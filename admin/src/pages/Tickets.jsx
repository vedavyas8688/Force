import {
  BellRing,
  CircleGauge,
  Eye,
  MoreVertical,
  Pencil,
  Settings,
  Ticket,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminTicketsApi, organizationApi, ticketsApi } from "../api/client";
import { DataTable, DataTablePanel, TablePagination } from "../components/ui/DataTable";
import { MetricGrid } from "../components/ui/MetricGrid";
import { SearchBox, Toolbar } from "../components/ui/Toolbar";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { key: "open", label: "Open", statuses: ["open", "triaged"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { key: "completed", label: "Completed", statuses: ["completed", "resolved"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
];

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [viewMode, setViewMode] = useState("overview");
  const [activeTab, setActiveTab] = useState("open");
  const [error, setError] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [orgStatus, setOrgStatus] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    loadOverview();
  }, [isSuperAdmin, user?.organizationId]);

  useEffect(() => {
    const search = searchParams.get("search") || "";
    if (search) {
      setOrgSearch(search);
      setTicketSearch(search);
    }
  }, [searchParams]);

  const organizations = overview?.organizations || [];
  const selectedOrg = organizations.find((item) => item.organization._id === selectedOrgId);
  const customers = useMemo(() => buildCustomerRows(selectedOrg?.tickets || []), [selectedOrg]);
  const selectedCustomer = customers.find((item) => item.id === selectedCustomerId);

  const visibleOrganizations = useMemo(() => {
    const search = orgSearch.trim().toLowerCase();
    return organizations
      .filter((item) => {
        const matchesSearch =
          !search ||
          item.organization.name?.toLowerCase().includes(search) ||
          item.organization.domain?.toLowerCase().includes(search);
        const matchesStatus = orgStatus === "all" || item.organization.status === orgStatus;
        return item.activeTickets > 0 && matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.activeTickets - a.activeTickets)
      .slice(0, 5);
  }, [orgSearch, orgStatus, organizations]);

  const filteredTickets = useMemo(() => {
    if (!selectedOrg || !selectedCustomer) return [];
    const tab = tabs.find((item) => item.key === activeTab);
    const search = ticketSearch.trim().toLowerCase();
    return selectedCustomer.tickets.filter((ticket) => {
      const matchesTab = tab.statuses.includes(ticket.status);
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      const matchesSearch =
        !search ||
        ticket.title?.toLowerCase().includes(search) ||
        ticket.description?.toLowerCase().includes(search) ||
        ticket.customerId?.email?.toLowerCase().includes(search) ||
        ticket.projectId?.name?.toLowerCase().includes(search) ||
        shortId(ticket._id).toLowerCase().includes(search);
      return matchesTab && matchesPriority && matchesSearch;
    });
  }, [activeTab, priorityFilter, selectedCustomer, selectedOrg, ticketSearch]);

  useEffect(() => {
    if (viewMode !== "organization" || !selectedOrg) return;
    if (!selectedCustomer) return;
    if (selectedCustomer.tickets.length === 0) return;
    if (filteredTickets.length > 0) return;

    const nextTab = firstAvailableTab(selectedCustomer.tickets);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, filteredTickets.length, selectedCustomer, viewMode]);

  async function loadOverview() {
    setError("");
    try {
      if (!isSuperAdmin) {
        const [data, settings] = await Promise.all([
          ticketsApi.list(),
          organizationApi.settings(),
        ]);
        const organizationOverview = buildTenantOverview({
          tickets: data.tickets || [],
          user,
          organization: settings.organization,
        });
        setOverview(organizationOverview);
        setSelectedOrgId(organizationOverview.organizations[0].organization._id);
        setViewMode("organization");
        return;
      }

      const data = await adminTicketsApi.overview();
      setOverview(data);
      if (!selectedOrgId && data.organizations?.[0]) {
        setSelectedOrgId(data.organizations[0].organization._id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function exportTickets() {
    if (!filteredTickets.length || !selectedOrg) return;
    const rows = [
      ["Ticket ID", "Subject", "Customer", "Project", "Priority", "Status", "Assigned To", "Created", "Updated", "SLA"],
      ...filteredTickets.map((ticket) => [
        shortId(ticket._id),
        ticket.title || "",
        ticket.customerId?.email || "",
        ticket.projectId?.name || "",
        ticket.priority || "",
        ticket.status || "",
        ticket.assignedTo?.email || "Unassigned",
        ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "",
        ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "",
        slaStatus(ticket),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedOrg.organization.name || "organization"}-tickets.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {error && <div className="form-error table-notice">{error}</div>}

      {viewMode === "overview" && isSuperAdmin && (
        <>
          <div className="page-heading-row">
            <div>
              <h1 className="page-title">Global Ticket Command Center</h1>
              <p className="page-subtitle">Monitor and manage tickets across all organizations</p>
            </div>
          </div>

          <MetricGrid items={summaryCards(overview?.summary)} />

          <Toolbar title="Organizations Overview" subtitle="All organizations and their ticket summary">
            <SearchBox
              placeholder="Search organization..."
              value={orgSearch}
              onChange={(event) => setOrgSearch(event.target.value)}
            />
            <select
              className="toolbar-select"
              value={orgStatus}
              onChange={(event) => setOrgStatus(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </Toolbar>

          <DataTablePanel>
            <DataTable
              className="org-table"
              columns={[
                "Organization",
                "Users",
                "Active Tickets",
                "Open",
                "Assigned",
                "In Progress",
                "Reopen Requests",
                "Action",
              ]}
            >
            {visibleOrganizations.map((item) => (
              <div className="data-grid-row org-table-row" key={item.organization._id}>
                <div className="org-name-cell">
                  <div className="org-logo compact-logo">{item.organization.name?.[0]?.toUpperCase() || "O"}</div>
                  <div>
                    <strong>{item.organization.name}</strong>
                    <small>ID: {orgCode(item.organization._id)}</small>
                  </div>
                </div>
                <span className="org-users-count">
                  <UsersRound size={16} />
                  <strong>{item.userCounts.total}</strong>
                  <small>Users</small>
                </span>
                <span><strong>{item.activeTickets}</strong><small> Active</small></span>
                <span className="count-blue">{item.counts.open}</span>
                <span className="count-orange">{item.counts.assigned}</span>
                <span className="count-purple">{item.counts.inProgress}</span>
                <span className="count-red">{item.counts.reopenRequests}</span>
                <div className="org-row-actions">
                  <button
                    className="org-view-small"
                    type="button"
                    onClick={() => {
                      setSelectedOrgId(item.organization._id);
                      setSelectedCustomerId("");
                      setActiveTab(firstAvailableTab(item.tickets));
                      setViewMode("organization");
                    }}
                  >
                    View
                  </button>
                  <MoreVertical size={17} className="muted-icon" />
                </div>
              </div>
            ))}
            </DataTable>
            {visibleOrganizations.length === 0 && (
              <div className="empty-state">
                <div className="id-tag">NO-ORGS</div>
                <p>No active organizations with open work match this filter.</p>
              </div>
            )}
            {visibleOrganizations.length > 0 && (
              <TablePagination
                start={1}
                end={visibleOrganizations.length}
                total={visibleOrganizations.length}
                label="active organizations"
                page={1}
                totalPages={1}
                pageSize={5}
                pageSizeOptions={[5]}
                disabled
              />
            )}
          </DataTablePanel>
          {topOpenOrganizations(visibleOrganizations).length > 0 && (
            <section className="top-open-panel">
              <h2>Top Open Organizations</h2>
              <div className="top-open-list">
                {topOpenOrganizations(visibleOrganizations).map((item) => (
                  <button
                    key={item.organization._id}
                    type="button"
                    onClick={() => {
                      setSelectedOrgId(item.organization._id);
                      setSelectedCustomerId("");
                      setActiveTab(firstAvailableTab(item.tickets));
                      setViewMode("organization");
                    }}
                  >
                    <span>{item.organization.name}</span>
                    <strong>{item.counts.open} open</strong>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {viewMode === "organization" && selectedOrg && (
        <section className="global-ticket-workspace">
          {isSuperAdmin && <button className="back-button" type="button" onClick={() => {
            setViewMode("overview");
          }}>
            Back to organizations
          </button>}
          <div className="workspace-header">
            <div>
              <span>Organizations &gt; {selectedOrg.organization.name}</span>
              <h2>{selectedOrg.organization.name}</h2>
              <p>Created {selectedOrg.organization.createdAt ? new Date(selectedOrg.organization.createdAt).toLocaleDateString() : "-"}</p>
            </div>
            <div className="workspace-counts">
              <span>{selectedOrg.userCounts.customers} customers</span>
              <span>{selectedOrg.userCounts.developers} agents</span>
              <span>{selectedOrg.counts.total} tickets</span>
            </div>
            <button className="org-settings-button" type="button" onClick={() => { window.location.href = "/settings"; }}>
              <Settings size={16} />
              Organization Settings
            </button>
          </div>

          <MetricGrid items={summaryCards(selectedOrg.counts)} className="org-metric-strip" />

          {!selectedCustomer ? (
            <section className="customer-ticket-directory">
              <Toolbar title="Customers" subtitle="Open a customer to view their tickets and history.">
                <SearchBox
                  placeholder="Search customers..."
                  value={ticketSearch}
                  onChange={(event) => setTicketSearch(event.target.value)}
                />
              </Toolbar>
              <DataTablePanel>
                <DataTable
                  className="customer-ticket-table"
                  columns={["Customer", "Tickets", "Open", "Assigned", "In Progress", "Closed", "Latest Ticket", "Action"]}
                >
                  {customers
                    .filter((customer) => {
                      const search = ticketSearch.trim().toLowerCase();
                      return !search || customer.name.toLowerCase().includes(search) || customer.email.toLowerCase().includes(search);
                    })
                    .map((customer) => (
                      <div className="data-grid-row customer-ticket-row" key={customer.id}>
                        <div className="org-name-cell">
                          <div className="org-logo compact-logo">{customer.name?.[0]?.toUpperCase() || "C"}</div>
                          <div>
                            <strong>{customer.name}</strong>
                            <small>{customer.email}</small>
                          </div>
                        </div>
                        <span><strong>{customer.counts.total}</strong><small> Tickets</small></span>
                        <span className="count-blue">{customer.counts.open}</span>
                        <span className="count-orange">{customer.counts.assigned}</span>
                        <span className="count-purple">{customer.counts.inProgress}</span>
                        <span>{customer.counts.closed}</span>
                        <span>{customer.latestTicket?.title || "-"}</span>
                        <button
                          className="org-view-small"
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(customer.id);
                            setActiveTab(firstAvailableTab(customer.tickets));
                            setTicketSearch("");
                          }}
                        >
                          View tickets
                        </button>
                      </div>
                    ))}
                </DataTable>
                {customers.length === 0 && (
                  <div className="empty-state">
                    <div className="id-tag">NO-CUSTOMERS</div>
                    <p>No customers have tickets yet.</p>
                  </div>
                )}
              </DataTablePanel>
            </section>
          ) : (
            <section className="customer-ticket-view">
              <div className="customer-ticket-header">
                <button className="back-button" type="button" onClick={() => setSelectedCustomerId("")}>
                  Back to customers
                </button>
                <div>
                  <h3>{selectedCustomer.name}</h3>
                  <p>{selectedCustomer.email} / {selectedCustomer.counts.total} tickets</p>
                </div>
              </div>

              <div className="ticket-tabs">
                {tabs.map((tab) => (
                  <button
                    className={activeTab === tab.key ? "ticket-tab active" : "ticket-tab"}
                    type="button"
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    <span>{countForTab(selectedCustomer.tickets, tab)}</span>
                  </button>
                ))}
              </div>

              <div className="ticket-master-detail org-admin-ticket-layout">
                <div className="ticket-filter-bar">
                  <SearchBox
                    placeholder="Search tickets..."
                    value={ticketSearch}
                    onChange={(event) => setTicketSearch(event.target.value)}
                  />
                  <select
                    className="toolbar-select"
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                  >
                    <option value="all">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="ticket-table-panel">
                  {filteredTickets.length === 0 ? (
                    <div className="empty-state">
                      <div className="id-tag">NO-TICKETS</div>
                      <p>No tickets in this status.</p>
                    </div>
                  ) : (
                    <div className="admin-ticket-list">
                      <div className="admin-ticket-row ticket-row-header customer-ticket-list-header">
                        <span>No.</span>
                        <span>Ticket ID</span>
                        <span>Subject</span>
                        <span>Project</span>
                        <span>Agent</span>
                        <span>Actions</span>
                      </div>
                      {filteredTickets.map((ticket, index) => (
                        <button
                          className="admin-ticket-row customer-ticket-list-row"
                          type="button"
                          key={ticket._id}
                          onClick={() => navigate(`/tickets/${ticket._id}`)}
                        >
                          <span>{index + 1}</span>
                          <span className="ticket-id">{shortId(ticket._id)}</span>
                          <strong>{limitText(ticket.title, 52)}</strong>
                          <span>{ticket.projectId?.name || "-"}</span>
                          <span>{ticket.assignedTo?.email || "Unassigned"}</span>
                          <span className="ticket-row-actions">
                            <Eye size={15} />
                            View
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </section>
      )}
    </>
  );
}

function buildCustomerRows(tickets = []) {
  const rows = new Map();

  for (const ticket of tickets) {
    const id = String(ticket.customerId?._id || ticket.customerId || "unknown");
    if (!rows.has(id)) {
      rows.set(id, {
        id,
        name: ticket.customerId?.name || ticket.customerId?.email || "Unknown customer",
        email: ticket.customerId?.email || "-",
        tickets: [],
        latestTicket: null,
        counts: null,
      });
    }

    const row = rows.get(id);
    row.tickets.push(ticket);
    if (!row.latestTicket || new Date(ticket.createdAt || 0) > new Date(row.latestTicket.createdAt || 0)) {
      row.latestTicket = ticket;
    }
  }

  return Array.from(rows.values())
    .map((row) => ({ ...row, counts: countTickets(row.tickets) }))
    .sort((a, b) => new Date(b.latestTicket?.createdAt || 0) - new Date(a.latestTicket?.createdAt || 0));
}

function buildTenantOverview({ tickets, user, organization }) {
  const counts = countTickets(tickets);
  const customerIds = new Set(
    tickets.map((ticket) => String(ticket.customerId?._id || ticket.customerId || "")).filter(Boolean)
  );
  const developerIds = new Set(
    tickets.map((ticket) => String(ticket.assignedTo?._id || ticket.assignedTo || "")).filter(Boolean)
  );

  return {
    summary: counts,
    organizations: [
      {
        organization: {
          _id: organization?.id || user?.organizationId || "organization",
          name: organization?.name || user?.organizationName || "Organization",
          slug: organization?.slug,
          status: organization?.status || "active",
          createdAt: organization?.createdAt || null,
        },
        tickets,
        counts,
        activeTickets: tickets.filter((ticket) => !["completed", "resolved", "closed"].includes(ticket.status)).length,
        userCounts: {
          total: Math.max(customerIds.size + developerIds.size + 1, 1),
          customers: customerIds.size,
          developers: developerIds.size,
        },
      },
    ],
  };
}

function countTickets(tickets = []) {
  return {
    total: tickets.length,
    open: tickets.filter((ticket) => ["open", "triaged"].includes(ticket.status)).length,
    assigned: tickets.filter((ticket) => ticket.status === "assigned").length,
    inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
    completed: tickets.filter((ticket) => ["completed", "resolved"].includes(ticket.status)).length,
    closed: tickets.filter((ticket) => ticket.status === "closed").length,
    reopenRequests: tickets.filter((ticket) =>
      (ticket.reopenRequests || []).some((request) => request.status === "pending")
    ).length,
  };
}

function summaryCards(summary = {}) {
  return [
    ["Total Tickets", "total", Ticket, "violet"],
    ["Open", "open", BellRing, "blue"],
    ["Assigned", "assigned", UserRoundCheck, "amber"],
    ["In Progress", "inProgress", CircleGauge, "purple"],
    ["Closed", "closed", Ticket, "slate"],
    ["Reopen Requests", "reopenRequests", BellRing, "red"],
  ].map(([label, key, icon, tone]) => ({ label, value: summary[key] || 0, icon, tone }));
}

function topOpenOrganizations(organizations) {
  return organizations
    .filter((item) => item.counts.open > 0)
    .slice()
    .sort((a, b) => b.counts.open - a.counts.open)
    .slice(0, 5);
}

function orgCode(id) {
  return `ORG-${String(id).slice(-3).toUpperCase()}`;
}

function titleCase(value = "") {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}

function countForTab(tickets, tab) {
  return tickets.filter((ticket) => tab.statuses.includes(ticket.status)).length;
}

function firstAvailableTab(tickets = []) {
  return tabs.find((tab) => countForTab(tickets, tab) > 0)?.key || "open";
}

function shortId(id) {
  return `T-${String(id).slice(-6).toUpperCase()}`;
}

function slaStatus(ticket) {
  if (!ticket.dueDate) return "No SLA";
  if (ticket.status === "closed") return "Closed";

  const due = new Date(ticket.dueDate).getTime();
  const now = Date.now();
  if (Number.isNaN(due)) return "No SLA";
  if (due < now) return "Overdue";
  if (due - now < 24 * 60 * 60 * 1000) return "Due soon";
  return "On track";
}

function slaClass(ticket) {
  const status = slaStatus(ticket).toLowerCase().replaceAll(" ", "-");
  return `sla-pill ${status}`;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function limitText(value = "", max = 50) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}
