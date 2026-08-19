import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { sendLoginOtpEmail } from "../notifications/email.service.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
} from "./token.service.js";

const otpRequiredRoles = new Set(["developer", "customer"]);

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Registers a brand-new organization AND its first admin user.
 * (Inviting additional users to an existing org is a separate flow.)
 */
export async function signup({ organizationName, name, email, password, phone, role = "admin" }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }

  const organization = await Organization.create({
    name: organizationName,
    slug: `${slugify(organizationName)}-${Date.now().toString(36)}`,
  });

  const passwordHash = await User.hashPassword(password);
  const normalizedRole = ["admin", "developer", "customer"].includes(role) ? role : "admin";

  const user = await User.create({
    organizationId: organization._id,
    name,
    email: email.toLowerCase(),
    phone: phone?.trim() || createUniquePhonePlaceholder(),
    passwordHash,
    role: normalizedRole,
  });

  if (otpRequiredRoles.has(user.role)) {
    const otp = await sendLoginOtp(user);

    return {
      requiresOtp: true,
      email: user.email,
      role: user.role,
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    };
  }

  return issueTokens(user);
}

function createUniquePhonePlaceholder() {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash"
  );

  if (!user || user.status !== "active") {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  if (otpRequiredRoles.has(user.role)) {
    const otp = await sendLoginOtp(user);

    return {
      requiresOtp: true,
      email: user.email,
      role: user.role,
      message: "OTP sent to your email",
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    };
  }

  return issueTokens(user);
}

export async function verifyLoginOtp({ email, otp }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+loginOtpHash +loginOtpExpiresAt"
  );

  if (!user || user.status !== "active" || !otpRequiredRoles.has(user.role)) {
    const err = new Error("Invalid OTP request");
    err.status = 401;
    throw err;
  }

  if (!user.loginOtpHash || !user.loginOtpExpiresAt || user.loginOtpExpiresAt < new Date()) {
    const err = new Error("OTP expired. Please sign in again.");
    err.status = 401;
    throw err;
  }

  const matches = await compareRefreshToken(String(otp), user.loginOtpHash);
  if (!matches) {
    const err = new Error("Invalid OTP");
    err.status = 401;
    throw err;
  }

  await User.findByIdAndUpdate(user._id, {
    $unset: { loginOtpHash: 1, loginOtpExpiresAt: 1 },
  });

  return issueTokens(user);
}

export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");
  if (!user || !user.refreshTokenHash) {
    const err = new Error("Invalid session");
    err.status = 401;
    throw err;
  }

  const matches = await compareRefreshToken(refreshToken, user.refreshTokenHash);
  if (!matches) {
    const err = new Error("Invalid session");
    err.status = 401;
    throw err;
  }

  return issueTokens(user);
}

export async function logout({ userId }) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}

export async function getCurrentUser({ userId }) {
  const user = await User.findById(userId).lean();
  if (!user || user.status !== "active") {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  return serializeUser(user);
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await User.findByIdAndUpdate(user._id, {
    refreshTokenHash: await hashRefreshToken(refreshToken),
  });

  return {
    accessToken,
    refreshToken,
    user: serializeUser(user),
  };
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
  };
}

async function sendLoginOtp(user) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const ttlSeconds = Number(process.env.OTP_TTL_SECONDS || 300);

  await User.findByIdAndUpdate(user._id, {
    loginOtpHash: await hashRefreshToken(otp),
    loginOtpExpiresAt: new Date(Date.now() + ttlSeconds * 1000),
    $unset: { refreshTokenHash: 1 },
  });

  await sendLoginOtpEmail({
    to: user.email,
    name: user.name,
    otp,
  });

  return otp;
}
