import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    repository: {
      provider: { type: String, default: "github" },
      fullName: { type: String, default: "" },
      owner: { type: String, default: "" },
      name: { type: String, default: "" },
      defaultBranch: { type: String, default: "main" },
      installationId: { type: Number, default: null },
      lastCommitSha: { type: String, default: "" },
      lastSyncedAt: { type: Date, default: null },
      syncStatus: {
        type: String,
        enum: ["not_connected", "connected", "syncing", "synced", "failed"],
        default: "not_connected",
      },
      syncError: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

projectSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Project = mongoose.model("Project", projectSchema);
