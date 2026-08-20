import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      default: "",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    metadata: {
      ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
      status: { type: String, default: "" },
      priority: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
