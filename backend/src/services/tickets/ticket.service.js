import mongoose from "mongoose";
import { Project } from "../../models/project.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { analyzeTicket, analyzeTicketSafely } from "../ai/ai.service.js";
import { notifyTicketEvent } from "../notifications/notification.service.js";

const populateFields = [
  { path: "projectId", select: "name" },
  { path: "customerId", select: "name email" },
  { path: "assignedTo", select: "name email role" },
  { path: "attachments.uploadedBy", select: "name email role" },
  { path: "comments.authorId", select: "name email role" },
  { path: "internalNotes.authorId", select: "name email role" },
  { path: "activity.actorId", select: "name email role" },
  { path: "closedBy", select: "name email role" },
  { path: "reopenRequests.requestedBy", select: "name email role" },
  { path: "reopenRequests.reviewedBy", select: "name email role" },
];

export async function listTickets({ organizationId, user }) {
  const filter = { organizationId };

  if (user.role === "customer") {
    filter.customerId = user.sub;
  }

  if (user.role === "developer") {
    filter.assignedTo = user.sub;
  }

  const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).populate(populateFields).lean();
  return tickets.map((ticket) => sanitizeTicketForRole(ticket, user.role));
}

export async function getTicket({ organizationId, user, ticketId }) {
  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const ticket = await Ticket.findOne(filter).populate(populateFields).lean();

  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  return sanitizeTicketForRole(ticket, user.role);
}

export async function createTicket({ organizationId, customerId, projectId, title, description, priority, dueDate, attachments }) {
  const project = await Project.findOne({ _id: projectId, organizationId, status: "active" });
  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  const ticket = await Ticket.create({
    organizationId,
    customerId,
    projectId,
    title,
    description,
    attachments: normalizeAttachments({ attachments, uploadedBy: customerId }),
    priority: priority || "medium",
    dueDate: dueDate || null,
    activity: [
      {
        actorId: customerId,
        action: "ticket_created",
        message: "Ticket created",
        toStatus: "open",
      },
    ],
  });

  await notifyTicketEvent({
    organizationId,
    ticketId: ticket._id,
    actorId: customerId,
    event: "ticket_created",
  });

  await analyzeTicketSafely({ organizationId, ticketId: ticket._id });

  const defaultStrategy = await getDefaultAssignmentStrategy(organizationId);
  if (defaultStrategy === "manual") {
    const unassignedTicket = await Ticket.findById(ticket._id).populate(populateFields);
    return sanitizeTicketForRole(unassignedTicket.toObject(), "customer");
  }

  try {
    return await autoAssignTicket({
      organizationId,
      ticketId: ticket._id,
    });
  } catch (err) {
    if (err.message !== "No active developers available") {
      throw err;
    }

    const unassignedTicket = await Ticket.findById(ticket._id).populate(populateFields);
    return sanitizeTicketForRole(unassignedTicket.toObject(), "customer");
  }
}

export async function updateTicketStatus({ organizationId, user, ticketId, status }) {
  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const existing = await Ticket.findOne(filter);

  if (!existing) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  assertStatusAllowedForRole({ role: user.role, fromStatus: existing.status, status });

  if (existing.status === "closed" && status !== "closed") {
    const err = new Error("Closed tickets require an approved reopen request");
    err.status = 403;
    throw err;
  }

  const now = new Date();
  const update = {
    $set: { status },
    $push: {
      activity: {
        actorId: user.sub,
        action: status === "completed" ? "completed" : status === "closed" ? "closed" : "status_changed",
        message: `Status changed from ${existing.status} to ${status}`,
        fromStatus: existing.status,
        toStatus: status,
      },
    },
  };

  if (status === "completed") {
    update.$set.completedAt = now;
  }

  if (status === "closed") {
    update.$set.closedAt = now;
    update.$set.closedBy = user.sub;
  }

  const ticket = await Ticket.findOneAndUpdate(filter, update, {
    new: true,
    runValidators: true,
  }).populate(populateFields);

  await notifyTicketEvent({
    organizationId,
    ticketId,
    actorId: user.sub,
    event:
      status === "completed"
        ? "ticket_completed"
        : status === "closed"
          ? "ticket_closed"
          : "ticket_status_changed",
    status,
  });

  return sanitizeTicketForRole(ticket.toObject(), user.role);
}

export async function addTicketComment({ organizationId, user, ticketId, body }) {
  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const existing = await Ticket.findOne(filter).select("status");
  if (!existing) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  if (existing.status === "closed") {
    const err = new Error("Closed ticket conversation is locked");
    err.status = 403;
    throw err;
  }

  const ticket = await Ticket.findOneAndUpdate(
    filter,
    {
      $push: {
        comments: {
          authorId: user.sub,
          body,
          visibility: "public",
        },
        activity: {
          actorId: user.sub,
          action: user.role === "customer" ? "customer_replied" : "agent_replied",
          message: body,
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

  return sanitizeTicketForRole(ticket.toObject(), user.role);
}

export async function addInternalNote({ organizationId, user, ticketId, body }) {
  if (!["admin", "developer"].includes(user.role)) {
    const err = new Error("Internal notes are not available to customers");
    err.status = 403;
    throw err;
  }

  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const existing = await Ticket.findOne(filter).select("status");
  if (!existing) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  if (existing.status === "closed") {
    const err = new Error("Closed tickets are locked");
    err.status = 403;
    throw err;
  }

  const ticket = await Ticket.findOneAndUpdate(
    filter,
    {
      $push: {
        internalNotes: {
          authorId: user.sub,
          body,
        },
        activity: {
          actorId: user.sub,
          action: "internal_note_added",
          message: body,
        },
      },
    },
    { new: true }
  ).populate(populateFields);

  await notifyTicketEvent({
    organizationId,
    ticketId,
    actorId: user.sub,
    event: "ticket_reopen_requested",
  });

  return sanitizeTicketForRole(ticket.toObject(), user.role);
}

export async function requestReopen({ organizationId, user, ticketId, reason }) {
  if (user.role !== "customer") {
    const err = new Error("Only customers can request reopening");
    err.status = 403;
    throw err;
  }

  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const existing = await Ticket.findOne(filter).select("status reopenRequests");
  if (!existing) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  if (existing.status !== "closed") {
    const err = new Error("Only closed tickets can request reopening");
    err.status = 400;
    throw err;
  }

  if (existing.reopenRequests?.some((request) => request.status === "pending")) {
    const err = new Error("A reopen request is already pending");
    err.status = 400;
    throw err;
  }

  const ticket = await Ticket.findOneAndUpdate(
    filter,
    {
      $push: {
        reopenRequests: {
          requestedBy: user.sub,
          reason,
        },
        activity: {
          actorId: user.sub,
          action: "reopen_requested",
          message: reason,
        },
      },
    },
    { new: true }
  ).populate(populateFields);

  return sanitizeTicketForRole(ticket.toObject(), user.role);
}

export async function reviewReopenRequest({ organizationId, user, ticketId, requestId, decision, adminNote }) {
  if (user.role !== "admin") {
    const err = new Error("Only admins can review reopen requests");
    err.status = 403;
    throw err;
  }

  const ticket = await Ticket.findOne({ _id: ticketId, organizationId });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  const request = ticket.reopenRequests.id(requestId);
  if (!request || request.status !== "pending") {
    const err = new Error("Pending reopen request not found");
    err.status = 404;
    throw err;
  }

  const approved = decision === "approved";
  request.status = approved ? "approved" : "rejected";
  request.reviewedBy = user.sub;
  request.reviewedAt = new Date();
  request.adminNote = adminNote || "";

  ticket.activity.push({
    actorId: user.sub,
    action: approved ? "reopen_approved" : "reopen_rejected",
    message: adminNote || (approved ? "Reopen approved" : "Reopen rejected"),
  });

  if (approved) {
    ticket.status = ticket.assignedTo ? "assigned" : "open";
    ticket.closedAt = null;
    ticket.closedBy = null;
    ticket.activity.push({
      actorId: user.sub,
      action: "status_changed",
      message: `Ticket reopened to ${ticket.status}`,
      fromStatus: "closed",
      toStatus: ticket.status,
    });
  }

  await ticket.save();
  const updatedTicket = await Ticket.findById(ticket._id).populate(populateFields);
  await notifyTicketEvent({
    organizationId,
    ticketId,
    actorId: user.sub,
    event: approved ? "ticket_reopened" : "ticket_status_changed",
    status: approved ? ticket.status : "closed",
  });
  return sanitizeTicketForRole(updatedTicket.toObject(), user.role);
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
    {
      $set: { assignedTo: developer._id, status: "assigned" },
      $push: {
        activity: {
          action: "assigned",
          message: `Assigned to ${developer.email}`,
          toStatus: "assigned",
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

  await analyzeTicketSafely({ organizationId, ticketId: ticket._id });

  await notifyTicketEvent({
    organizationId,
    ticketId: ticket._id,
    actorId: null,
    event: "ticket_assigned",
    status: "assigned",
  });

  return sanitizeTicketForRole(ticket.toObject(), "admin");
}

function normalizeAttachments({ attachments = [], uploadedBy }) {
  const maxFiles = Number(process.env.TICKET_MAX_ATTACHMENTS || 4);
  const maxBytes = Number(process.env.TICKET_MAX_ATTACHMENT_BYTES || 1_500_000);

  if (!Array.isArray(attachments)) return [];

  return attachments.slice(0, maxFiles).map((attachment) => {
    const name = String(attachment?.name || "").trim();
    const type = String(attachment?.type || "").trim();
    const size = Number(attachment?.size || 0);
    const dataUrl = String(attachment?.dataUrl || "");

    if (!name) {
      const err = new Error("Attachment name is required");
      err.status = 400;
      throw err;
    }

    if (size > maxBytes) {
      const err = new Error(`Attachment ${name} is too large`);
      err.status = 400;
      throw err;
    }

    if (dataUrl && !dataUrl.startsWith("data:")) {
      const err = new Error(`Attachment ${name} is invalid`);
      err.status = 400;
      throw err;
    }

    return {
      name,
      type,
      size,
      dataUrl,
      description: String(attachment?.description || "").trim(),
      uploadedBy,
    };
  });
}

export async function analyzeTicketForUser({ organizationId, user, ticketId }) {
  if (!["admin", "developer"].includes(user.role)) {
    const err = new Error("AI analysis is only available to admin and developers");
    err.status = 403;
    throw err;
  }

  const filter = buildTicketAccessFilter({ organizationId, user, ticketId });
  const ticket = await Ticket.findOne(filter).select("_id");
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  await analyzeTicket({ organizationId, ticketId });
  const updatedTicket = await Ticket.findById(ticketId).populate(populateFields);
  return sanitizeTicketForRole(updatedTicket.toObject(), user.role);
}

export async function autoAssignTicket({ organizationId, ticketId, strategy }) {
  const ticket = await Ticket.findOne({ _id: ticketId, organizationId });
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  const selectedStrategy = strategy || (await getDefaultAssignmentStrategy(organizationId));
  if (selectedStrategy === "manual") {
    const err = new Error("Manual assignment is selected. Choose a developer for this ticket.");
    err.status = 400;
    throw err;
  }

  const developer = await chooseDeveloper({ organizationId, strategy: selectedStrategy });
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

function assertStatusAllowedForRole({ role, fromStatus, status }) {
  const allowedByRole = {
    admin: ["open", "assigned", "in_progress", "pending_customer", "completed", "closed"],
    developer: ["in_progress", "pending_customer", "completed", "closed"],
    customer: ["closed"],
  };

  if (!allowedByRole[role]?.includes(status)) {
    const err = new Error("Status change not allowed");
    err.status = 403;
    throw err;
  }

  const completedStatuses = ["completed", "resolved"];

  if (role === "customer" && !(completedStatuses.includes(fromStatus) && status === "closed")) {
    const err = new Error("Customer can only close completed tickets");
    err.status = 403;
    throw err;
  }

  if (role === "developer" && status === "closed" && !completedStatuses.includes(fromStatus)) {
    const err = new Error("Developer can only close completed tickets");
    err.status = 403;
    throw err;
  }
}

function sanitizeTicketForRole(ticket, role) {
  if (role !== "customer") {
    return ticket;
  }

  return {
    ...ticket,
    internalNotes: undefined,
    activity: (ticket.activity || []).filter((item) => item.action !== "internal_note_added"),
  };
}
