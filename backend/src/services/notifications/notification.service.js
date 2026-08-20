import { Notification } from "../../models/notification.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { User } from "../../models/user.model.js";
import { enqueueNotificationDispatch } from "./notification.queue.js";
import { broadcastNotification } from "./notification.stream.js";

const populateFields = [
  { path: "actorId", select: "name email role" },
  { path: "metadata.ticketId", select: "title status priority" },
];

export async function listNotifications({ organizationId, user, limit = 30 }) {
  const filter = { recipientId: user.sub };
  if (user.role !== "super_admin") {
    filter.organizationId = organizationId;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 100))
    .populate(populateFields)
    .lean();

  const unreadCount = await Notification.countDocuments({
    ...filter,
    readAt: null,
  });

  return { notifications, unreadCount };
}

export async function markNotificationRead({ organizationId, user, notificationId }) {
  const filter = { _id: notificationId, recipientId: user.sub };
  if (user.role !== "super_admin") {
    filter.organizationId = organizationId;
  }

  const notification = await Notification.findOneAndUpdate(
    filter,
    { $set: { readAt: new Date() } },
    { new: true }
  )
    .populate(populateFields)
    .lean();

  if (!notification) {
    const err = new Error("Notification not found");
    err.status = 404;
    throw err;
  }

  return notification;
}

export async function markAllNotificationsRead({ organizationId, user }) {
  const filter = { recipientId: user.sub, readAt: null };
  if (user.role !== "super_admin") {
    filter.organizationId = organizationId;
  }

  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return listNotifications({ organizationId, user });
}

export async function notifyUsers({ organizationId, recipientIds, actorId = null, type, title, body = "", link = "", metadata = {} }) {
  const uniqueRecipients = [...new Set((recipientIds || []).filter(Boolean).map(String))];
  if (uniqueRecipients.length === 0) return [];

  const docs = uniqueRecipients.map((recipientId) => ({
    organizationId,
    recipientId,
    actorId,
    type,
    title,
    body,
    link,
    metadata,
  }));

  const notifications = await Notification.insertMany(docs);

  await Promise.all(
    notifications.map(async (notification) => {
      broadcastNotification(notification.recipientId, notification.toObject());
      try {
        await enqueueNotificationDispatch(notification._id);
      } catch (err) {
        console.warn("[notifications] queue dispatch skipped:", err.message);
      }
    })
  );

  return notifications;
}

export async function notifyTicketEvent({ organizationId, ticketId, actorId = null, event, status = "" }) {
  const ticket = await Ticket.findOne({ _id: ticketId, organizationId })
    .populate([
      { path: "projectId", select: "name" },
      { path: "customerId", select: "name email" },
      { path: "assignedTo", select: "name email" },
    ])
    .lean();

  if (!ticket) return [];

  const recipients = await recipientsForTicketEvent({ organizationId, ticket, event, actorId });
  const copy = ticketNotificationCopy({ ticket, event, status });

  return notifyUsers({
    organizationId,
    recipientIds: recipients,
    actorId,
    type: event,
    title: copy.title,
    body: copy.body,
    link: `/tickets/${ticket._id}`,
    metadata: {
      ticketId: ticket._id,
      projectId: ticket.projectId?._id || ticket.projectId || null,
      status: status || ticket.status,
      priority: ticket.priority,
    },
  });
}

export async function markNotificationDelivered(notificationId) {
  await Notification.findByIdAndUpdate(notificationId, {
    $set: { deliveredAt: new Date() },
  });
}

async function recipientsForTicketEvent({ organizationId, ticket, event, actorId }) {
  const adminUsers = await User.find({ organizationId, role: "admin", status: "active" })
    .select("_id")
    .lean();

  const recipients = new Set(adminUsers.map((user) => String(user._id)));

  if (["ticket_assigned", "ticket_status_changed", "ticket_completed", "ticket_closed"].includes(event)) {
    if (ticket.customerId?._id) recipients.add(String(ticket.customerId._id));
  }

  if (["ticket_assigned", "ticket_status_changed", "ticket_reopened"].includes(event)) {
    if (ticket.assignedTo?._id) recipients.add(String(ticket.assignedTo._id));
  }

  if (event === "ticket_created") {
    if (ticket.customerId?._id) recipients.add(String(ticket.customerId._id));
  }

  if (event === "ticket_reopen_requested") {
    if (ticket.customerId?._id) recipients.add(String(ticket.customerId._id));
  }

  if (actorId) recipients.delete(String(actorId));
  return [...recipients];
}

function ticketNotificationCopy({ ticket, event, status }) {
  const title = ticket.title || "Ticket";
  const project = ticket.projectId?.name ? ` in ${ticket.projectId.name}` : "";

  const copy = {
    ticket_created: {
      title: "New ticket created",
      body: `${title}${project} is waiting for review.`,
    },
    ticket_assigned: {
      title: "Ticket assigned",
      body: `${title} was assigned to ${ticket.assignedTo?.name || ticket.assignedTo?.email || "a developer"}.`,
    },
    ticket_status_changed: {
      title: "Ticket status changed",
      body: `${title} moved to ${formatStatus(status || ticket.status)}.`,
    },
    ticket_completed: {
      title: "Ticket completed",
      body: `${title} is ready for verification.`,
    },
    ticket_closed: {
      title: "Ticket closed",
      body: `${title} has been closed.`,
    },
    ticket_reopen_requested: {
      title: "Reopen requested",
      body: `${title} needs admin review.`,
    },
    ticket_reopened: {
      title: "Ticket reopened",
      body: `${title} is active again.`,
    },
  };

  return copy[event] || {
    title: "Ticket updated",
    body: `${title} was updated.`,
  };
}

function formatStatus(status = "") {
  return status.replaceAll("_", " ");
}
