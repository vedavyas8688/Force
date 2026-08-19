import mongoose from "mongoose";

const codeFileSchema = new mongoose.Schema(
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
    repositoryFullName: {
      type: String,
      required: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
    },
    sha: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    language: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

codeFileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export const CodeFile = mongoose.model("CodeFile", codeFileSchema);
