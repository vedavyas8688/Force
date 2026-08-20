import { Organization } from "../../models/organization.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { User } from "../../models/user.model.js";
import * as ticketService from "../tickets/ticket.service.js";

const ticketPopulateFields = [
  { path: "projectId", select: "name" },
  { path: "customerId", select: "name email role status" },
  { path: "assignedTo", select: "name email role status" },
  { path: "comments.authorId", select: "name email role" },
  { path: "internalNotes.authorId", select: "name email role" },
  { path: "activity.actorId", select: "name email role" },
  { path: "closedBy", select: "name email role" },
  { path: "reopenRequests.requestedBy", select: "name email role" },
  { path: "reopenRequests.reviewedBy", select: "name email role" },
];

const statusBuckets = {
  open: ["open", "triaged"],
  assigned: ["assigned"],
  inProgress: ["in_progress"],
  pendingCustomer: ["pending_customer"],
  completed: ["completed", "resolved"],
  closed: ["closed"],
};

export async function getGlobalTicketOverview() {
  const organizations = await Organization.find({}).sort({ createdAt: -1 }).lean();
  const organizationIds = organizations.map((organization) => organization._id);

  const [tickets, users] = await Promise.all([
    Ticket.find({ organizationId: { $in: organizationIds } })
      .sort({ updatedAt: -1 })
      .populate(ticketPopulateFields)
      .lean(),
    User.find({ organizationId: { $in: organizationIds } })
      .select("organizationId role status")
      .lean(),
  ]);

  const ticketsByOrganization = groupByOrganization(tickets);
  const usersByOrganization = groupByOrganization(users);

  const organizationCards = organizations.map((organization) => {
    const orgTickets = ticketsByOrganization.get(String(organization._id)) || [];
    const orgUsers = usersByOrganization.get(String(organization._id)) || [];

    return {
      organization,
      counts: buildCounts(orgTickets),
      userCounts: {
        total: orgUsers.length,
        customers: orgUsers.filter((user) => user.role === "customer").length,
        developers: orgUsers.filter((user) => user.role === "developer").length,
        admins: orgUsers.filter((user) => user.role === "admin").length,
      },
      activeTickets: orgTickets.filter((ticket) => ticket.status !== "closed").length,
      highUrgentTickets: orgTickets.filter((ticket) =>
        ["high", "urgent"].includes(ticket.priority)
      ).length,
      lastActivity: orgTickets[0]?.updatedAt || organization.updatedAt,
      tickets: orgTickets,
    };
  });

  return {
    summary: buildCounts(tickets),
    organizations: organizationCards,
  };
}

export async function getGlobalTicket({ ticketId }) {
  const ticket = await Ticket.findById(ticketId).populate(ticketPopulateFields).lean();
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  return ticket;
}

export async function updateGlobalTicketStatus({ user, ticketId, status }) {
  const ticket = await findTicketForGlobalAdmin(ticketId);
  return ticketService.updateTicketStatus({
    organizationId: ticket.organizationId,
    user,
    ticketId,
    status,
  });
}

export async function addGlobalTicketComment({ user, ticketId, body }) {
  const ticket = await findTicketForGlobalAdmin(ticketId);
  return ticketService.addTicketComment({
    organizationId: ticket.organizationId,
    user,
    ticketId,
    body,
  });
}

export async function addGlobalInternalNote({ user, ticketId, body }) {
  const ticket = await findTicketForGlobalAdmin(ticketId);
  return ticketService.addInternalNote({
    organizationId: ticket.organizationId,
    user,
    ticketId,
    body,
  });
}

export async function reviewGlobalReopenRequest({ user, ticketId, requestId, decision, adminNote }) {
  const ticket = await findTicketForGlobalAdmin(ticketId);
  return ticketService.reviewReopenRequest({
    organizationId: ticket.organizationId,
    user,
    ticketId,
    requestId,
    decision,
    adminNote,
  });
}

async function findTicketForGlobalAdmin(ticketId) {
  const ticket = await Ticket.findById(ticketId).select("organizationId").lean();
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }
  return ticket;
}

function groupByOrganization(items) {
  const map = new Map();

  for (const item of items) {
    const key = String(item.organizationId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  return map;
}

function buildCounts(tickets) {
  const counts = {
    total: tickets.length,
    open: 0,
    assigned: 0,
    inProgress: 0,
    pendingCustomer: 0,
    completed: 0,
    closed: 0,
    reopenRequests: 0,
  };

  for (const ticket of tickets) {
    for (const [key, statuses] of Object.entries(statusBuckets)) {
      if (statuses.includes(ticket.status)) counts[key] += 1;
    }

    counts.reopenRequests += (ticket.reopenRequests || []).filter(
      (request) => request.status === "pending"
    ).length;
  }

  return counts;
}
