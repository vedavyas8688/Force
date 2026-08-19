import mongoose from "mongoose";

const commitSchema = new mongoose.Schema(
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
    installationId: {
      type: Number,
      required: true,
      index: true,
    },
    repositoryFullName: {
      type: String,
      required: true,
      index: true,
    },
    sha: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    author: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      username: { type: String, default: "" },
    },
    timestamp: {
      type: Date,
      index: true,
    },
    filesChanged: [
      {
        filename: String,
        status: String,
        additions: Number,
        deletions: Number,
        changes: Number,
      },
    ],
  },
  { timestamps: true }
);

commitSchema.index({ projectId: 1, sha: 1 }, { unique: true });

export const Commit = mongoose.model("Commit", commitSchema);
