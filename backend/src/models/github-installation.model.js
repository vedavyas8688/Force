import mongoose from "mongoose";

const githubInstallationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    installationId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    githubAccountLogin: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
      index: true,
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

githubInstallationSchema.index({ organizationId: 1, installationId: 1 }, { unique: true });

export const GitHubInstallation = mongoose.model("GitHubInstallation", githubInstallationSchema);
