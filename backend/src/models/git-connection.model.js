import mongoose from "mongoose";

const gitConnectionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["github"],
      default: "github",
      index: true,
    },
    providerUserId: {
      type: String,
      required: true,
      index: true,
    },
    providerUsername: {
      type: String,
      required: true,
      trim: true,
    },
    encryptedAccessToken: {
      type: String,
      required: true,
      select: false,
    },
    scopes: [{ type: String }],
    status: {
      type: String,
      enum: ["active", "disconnected"],
      default: "active",
      index: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

gitConnectionSchema.index({ organizationId: 1, provider: 1, providerUserId: 1 }, { unique: true });

export const GitConnection = mongoose.model("GitConnection", gitConnectionSchema);
