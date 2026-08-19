import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
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
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: () => `auto-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never return by default
    },
    role: {
      type: String,
      enum: ["admin", "developer", "customer"],
      default: "customer",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "active",
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    loginOtpHash: {
      type: String,
      select: false,
    },
    loginOtpExpiresAt: {
      type: Date,
      select: false,
    },
    inviteOtpHash: {
      type: String,
      select: false,
    },
    inviteOtpExpiresAt: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// One email can only exist once per organization (multi-tenant safe)
userSchema.index({ organizationId: 1, email: 1 }, { unique: true });

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.statics.hashPassword = function (plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

export const User = mongoose.model("User", userSchema);
