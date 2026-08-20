import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedTeam: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        name: { type: String, required: true, trim: true },
        type: { type: String, default: "" },
        size: { type: Number, default: 0 },
        dataUrl: { type: String, default: "" },
        description: { type: String, default: "" },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: [
        "open",
        "triaged",
        "assigned",
        "in_progress",
        "pending_customer",
        "resolved",
        "completed",
        "closed",
      ],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    comments: [
      {
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        body: { type: String, required: true, trim: true },
        visibility: { type: String, enum: ["public"], default: "public" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    internalNotes: [
      {
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        body: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    activity: [
      {
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        action: {
          type: String,
          enum: [
            "ticket_created",
            "assigned",
            "status_changed",
            "agent_replied",
            "customer_replied",
            "internal_note_added",
            "completed",
            "closed",
            "reopen_requested",
            "reopen_approved",
            "reopen_rejected",
          ],
          required: true,
        },
        message: { type: String, default: "" },
        fromStatus: { type: String, default: "" },
        toStatus: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    completedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reopenRequests: [
      {
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, required: true, trim: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        reviewedAt: { type: Date, default: null },
        adminNote: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    aiAnalysis: {
      status: {
        type: String,
        enum: ["not_started", "pending", "completed", "failed", "skipped"],
        default: "not_started",
      },
      summary: { type: String, default: "" },
      title: { type: String, default: "" },
      ticketLabel: { type: String, default: "" },
      priorityLabel: { type: String, default: "" },
      problem: { type: String, default: "" },
      likelyRootCause: { type: String, default: "" },
      developerBrief: { type: String, default: "" },
      suspectedFiles: [
        {
          path: { type: String, default: "" },
          reason: { type: String, default: "" },
          lineStart: { type: Number, default: null },
          lineEnd: { type: Number, default: null },
        },
      ],
      sections: [
        {
          title: { type: String, default: "" },
          body: { type: String, default: "" },
          items: [{ type: String }],
          code: { type: String, default: "" },
          severity: { type: String, default: "" },
        },
      ],
      investigationSteps: [{ type: String }],
      suggestedFixes: [{ type: String }],
      validationSteps: [{ type: String }],
      confidence: { type: Number, default: 0 },
      provider: { type: String, default: "" },
      model: { type: String, default: "" },
      error: { type: String, default: "" },
      analyzedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export const Ticket = mongoose.model("Ticket", ticketSchema);
