import mongoose from "mongoose";
import { Project } from "../../models/project.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";

const populateFields = [
  { path: "projectId", select: "name" },
  { path: "customerId", select: "name email" },
  { path: "assignedTo", select: "name email role" },
  { path: "comments.authorId", select: "name email role" },
];

export async function listTickets({ organizationId, user }) {
  const filter = { organizationId };

  if (user.role === "customer") {
    filter.customerId = user.sub;
  }

  if (user.role === "developer") {
    filter.assignedTo = user.sub;
  }

  return Ticket.find(filter).sort({ createdAt: -1 }).populate(populateFields).lean();
}

export async function getTicket({ organizationId, user, ticketId }) {
  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const ticket = await Ticket.findOne(filter).populate(populateFields).lean();

  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  return ticket;
}

export async function createTicket({ organizationId, customerId, projectId, title, description, priority }) {
  const project = await Project.findOne({ _id: projectId, organizationId, status: "active" });
  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  return Ticket.create({
    organizationId,
    customerId,
    projectId,
    title,
    description,
    priority: priority || "medium",
  });
}

export async function updateTicketStatus({ organizationId, user, ticketId, status }) {
  assertStatusAllowedForRole({ role: user.role, status });

  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const ticket = await Ticket.findOneAndUpdate(
    filter,
    { $set: { status } },
    { new: true, runValidators: true }
  ).populate(populateFields);

  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  return ticket;
}

export async function addTicketComment({ organizationId, user, ticketId, body }) {
  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const ticket = await Ticket.findOneAndUpdate(
    filter,
    {
      $push: {
        comments: {
          authorId: user.sub,
          body,
        },
      },
    },
    { new: true }
  ).populate(populateFields);

  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  return ticket;
}

export async function assignTicket({ organizationId, ticketId, developerId }) {
  const developer = await User.findOne({
    _id: developerId,
    organizationId,
    role: "developer",
    status: "active",
  });

  if (!developer) {
    const err = new Error("Active developer not found");
    err.status = 404;
    throw err;
  }

  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, organizationId },
    { $set: { assignedTo: developer._id, status: "assigned" } },
    { new: true }
  ).populate(populateFields);

  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  return ticket;
}

export async function autoAssignTicket({ organizationId, ticketId, strategy }) {
  const ticket = await Ticket.findOne({ _id: ticketId, organizationId });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  const developer = await chooseDeveloper({ organizationId, strategy });
  return assignTicket({ organizationId, ticketId, developerId: developer._id });
}

export async function autoAssignUnassignedTickets({ organizationId, strategy }) {
  const tickets = await Ticket.find({
    organizationId,
    assignedTo: null,
    status: { $in: ["open", "triaged"] },
  })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();

  const assigned = [];

  for (const ticket of tickets) {
    assigned.push(await autoAssignTicket({ organizationId, ticketId: ticket._id, strategy }));
  }

  return assigned;
}

async function chooseDeveloper({ organizationId, strategy }) {
  const organizationObjectId = new mongoose.Types.ObjectId(String(organizationId));
  const selectedStrategy = strategy || (await getDefaultAssignmentStrategy(organizationId));
  const developers = await User.find({
    organizationId,
    role: "developer",
    status: "active",
  })
    .sort({ createdAt: 1 })
    .select("_id name email")
    .lean();

  if (developers.length === 0) {
    const err = new Error("No active developers available");
    err.status = 400;
    throw err;
  }

  if (selectedStrategy === "first_available") {
    return developers[0];
  }

  if (selectedStrategy === "random") {
    return developers[Math.floor(Math.random() * developers.length)];
  }

  if (selectedStrategy === "round_robin") {
    const organization = await Organization.findById(organizationId).select(
      "assignmentState.roundRobinIndex"
    );
    const index = organization?.assignmentState?.roundRobinIndex || 0;
    const developer = developers[index % developers.length];

    await Organization.findByIdAndUpdate(organizationId, {
      $set: { "assignmentState.roundRobinIndex": (index + 1) % developers.length },
    });

    return developer;
  }

  if (selectedStrategy === "least_load") {
    const counts = await Ticket.aggregate([
      {
        $match: {
          organizationId: organizationObjectId,
          assignedTo: { $in: developers.map((developer) => developer._id) },
          status: { $in: ["assigned", "in_progress"] },
        },
      },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]);

    const countByDeveloper = new Map(
      counts.map((item) => [String(item._id), item.count])
    );

    return developers
      .map((developer) => ({
        ...developer,
        activeTicketCount: countByDeveloper.get(String(developer._id)) || 0,
      }))
      .sort((a, b) => a.activeTicketCount - b.activeTicketCount)[0];
  }

  const err = new Error("Unsupported assignment strategy");
  err.status = 400;
  throw err;
}

async function getDefaultAssignmentStrategy(organizationId) {
  const organization = await Organization.findById(organizationId)
    .select("assignmentSettings.defaultStrategy")
    .lean();

  return organization?.assignmentSettings?.defaultStrategy || "round_robin";
}

function buildTicketAccessFilter({ organizationId, user, ticketId }) {
  const filter = { _id: ticketId, organizationId };

  if (user.role === "customer") {
    filter.customerId = user.sub;
  }

  if (user.role === "developer") {
    filter.assignedTo = user.sub;
  }

  return filter;
}

function assertStatusAllowedForRole({ role, status }) {
  const allowedByRole = {
    admin: ["open", "triaged", "assigned", "in_progress", "resolved", "closed"],
    developer: ["in_progress", "resolved", "closed"],
    customer: ["open", "closed"],
  };

  if (!allowedByRole[role]?.includes(status)) {
    const err = new Error("Status change not allowed");
    err.status = 403;
    throw err;
  }
}
