import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

export function hashRefreshToken(token) {
  return bcrypt.hash(token, 10);
}

export function compareRefreshToken(token, hash) {
  return bcrypt.compare(token, hash);
}
