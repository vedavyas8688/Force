import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "business", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    assignmentState: {
      roundRobinIndex: {
        type: Number,
        default: 0,
      },
    },
    assignmentSettings: {
      defaultStrategy: {
        type: String,
        enum: ["round_robin", "least_load", "random", "first_available"],
        default: "round_robin",
      },
    },
  },
  { timestamps: true }
);

export const Organization = mongoose.model("Organization", organizationSchema);
