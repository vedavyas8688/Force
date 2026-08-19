import { Project } from "../../models/project.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { User } from "../../models/user.model.js";

const activeTicketStatuses = ["open", "triaged", "assigned", "in_progress", "pending_customer"];
const completedTicketStatuses = ["completed", "resolved"];

export async function getDashboardSummary({ organizationId, user }) {
  if (user.role === "admin") {
    return getAdminSummary(organizationId);
  }

  if (user.role === "developer") {
    return getDeveloperSummary({ organizationId, developerId: user.sub });
  }

  return getCustomerSummary({ organizationId, customerId: user.sub });
}

async function getAdminSummary(organizationId) {
  const [
    totalTickets,
    openTickets,
    unassignedTickets,
    activeProjects,
    activeDevelopers,
    activeCustomers,
  ] = await Promise.all([
    Ticket.countDocuments({ organizationId }),
    Ticket.countDocuments({ organizationId, status: { $in: activeTicketStatuses } }),
    Ticket.countDocuments({
      organizationId,
      assignedTo: null,
      status: { $in: ["open", "triaged"] },
    }),
    Project.countDocuments({ organizationId, status: "active" }),
    User.countDocuments({ organizationId, role: "developer", status: "active" }),
    User.countDocuments({ organizationId, role: "customer", status: "active" }),
  ]);

  const recentTickets = await Ticket.find({ organizationId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate([
      { path: "projectId", select: "name" },
      { path: "customerId", select: "name email" },
      { path: "assignedTo", select: "name email" },
    ])
    .lean();

  return {
    stats: {
      totalTickets,
      openTickets,
      unassignedTickets,
      activeProjects,
      activeDevelopers,
      activeCustomers,
    },
    recentTickets,
  };
}

async function getCustomerSummary({ organizationId, customerId }) {
  const [totalTickets, openTickets, resolvedTickets, activeProjects] = await Promise.all([
    Ticket.countDocuments({ organizationId, customerId }),
    Ticket.countDocuments({
      organizationId,
      customerId,
      status: { $in: activeTicketStatuses },
    }),
    Ticket.countDocuments({
      organizationId,
      customerId,
      status: { $in: [...completedTicketStatuses, "closed"] },
    }),
    Project.countDocuments({ organizationId, status: "active" }),
  ]);

  const recentTickets = await Ticket.find({ organizationId, customerId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate([
      { path: "projectId", select: "name" },
      { path: "assignedTo", select: "name email" },
    ])
    .lean();

  return {
    stats: {
      totalTickets,
      openTickets,
      resolvedTickets,
      activeProjects,
    },
    recentTickets,
  };
}

async function getDeveloperSummary({ organizationId, developerId }) {
  const [assignedTickets, inProgressTickets, resolvedTickets, closedTickets] =
    await Promise.all([
      Ticket.countDocuments({ organizationId, assignedTo: developerId }),
      Ticket.countDocuments({ organizationId, assignedTo: developerId, status: "in_progress" }),
      Ticket.countDocuments({ organizationId, assignedTo: developerId, status: { $in: completedTicketStatuses } }),
      Ticket.countDocuments({ organizationId, assignedTo: developerId, status: "closed" }),
    ]);

  const recentTickets = await Ticket.find({ organizationId, assignedTo: developerId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate([
      { path: "projectId", select: "name" },
      { path: "customerId", select: "name email" },
    ])
    .lean();

  return {
    stats: {
      assignedTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
    },
    recentTickets,
  };
}
