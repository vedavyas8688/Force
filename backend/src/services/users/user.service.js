import { User } from "../../models/user.model.js";
import { sendInviteOtpEmail } from "../notifications/email.service.js";
import { hashRefreshToken, compareRefreshToken } from "../auth/token.service.js";

const inviteRoles = new Set(["developer", "customer"]);

export async function listUsers({ organizationId }) {
  return User.find({ organizationId })
    .sort({ createdAt: -1 })
    .select("_id name email phone role status createdAt")
    .lean();
}

export async function inviteUser({ organizationId, name, email, role }) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedRole = role?.trim();

  if (!inviteRoles.has(normalizedRole)) {
    const err = new Error("Invite role must be developer or customer");
    err.status = 400;
    throw err;
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing && existing.status !== "invited") {
    const err = new Error("User already exists");
    err.status = 409;
    throw err;
  }
  if (existing && String(existing.organizationId) !== String(organizationId)) {
    const err = new Error("User already belongs to another organization");
    err.status = 409;
    throw err;
  }

  const otp = createOtp();
  const ttlSeconds = Number(process.env.OTP_TTL_SECONDS || 300);
  const passwordHash = await User.hashPassword(`invite-${Date.now()}-${Math.random()}`);

  const user = await User.findOneAndUpdate(
    { organizationId, email: normalizedEmail },
    {
      $set: {
        organizationId,
        name: name.trim(),
        email: normalizedEmail,
        role: normalizedRole,
        status: "invited",
        passwordHash,
        inviteOtpHash: await hashRefreshToken(otp),
        inviteOtpExpiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
      $unset: {
        refreshTokenHash: 1,
        loginOtpHash: 1,
        loginOtpExpiresAt: 1,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select("_id name email role status createdAt");

  await sendInviteOtpEmail({
    to: user.email,
    name: user.name,
    role: user.role,
    otp,
    acceptUrl: createInviteAcceptUrl({ email: user.email, role: user.role }),
  });

  return { user };
}

export async function acceptInvite({ email, otp, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+inviteOtpHash +inviteOtpExpiresAt"
  );

  if (!user || user.status !== "invited") {
    const err = new Error("Invalid invite");
    err.status = 401;
    throw err;
  }

  if (!user.inviteOtpHash || !user.inviteOtpExpiresAt || user.inviteOtpExpiresAt < new Date()) {
    const err = new Error("Invite OTP expired. Ask admin to resend invite.");
    err.status = 401;
    throw err;
  }

  const matches = await compareRefreshToken(String(otp), user.inviteOtpHash);
  if (!matches) {
    const err = new Error("Invalid invite OTP");
    err.status = 401;
    throw err;
  }

  user.passwordHash = await User.hashPassword(password);
  user.status = "active";
  user.inviteOtpHash = undefined;
  user.inviteOtpExpiresAt = undefined;
  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function removeUser({ organizationId, actorUserId, userId }) {
  if (String(actorUserId) === String(userId)) {
    const err = new Error("You cannot remove your own account");
    err.status = 400;
    throw err;
  }

  const user = await User.findOne({ _id: userId, organizationId });
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (user.role === "admin") {
    const adminCount = await User.countDocuments({
      organizationId,
      role: "admin",
      status: { $ne: "disabled" },
    });

    if (adminCount <= 1) {
      const err = new Error("Cannot remove the last admin");
      err.status = 400;
      throw err;
    }
  }

  await User.deleteOne({ _id: user._id, organizationId });

  return {
    id: user._id,
    email: user.email,
  };
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createInviteAcceptUrl({ email, role }) {
  const baseUrl =
    role === "customer"
      ? process.env.CUSTOMER_URL || "http://localhost:3001"
      : process.env.DEVELOPER_URL || "http://localhost:3003";

  const url = new URL("/accept-invite", baseUrl);
  url.searchParams.set("email", email);

  return url.toString();
}
