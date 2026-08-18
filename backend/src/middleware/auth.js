import { verifyAccessToken } from "../services/auth/token.service.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing access token" });
  }

  try {
    const payload = verifyAccessToken(token);
    // Attach the decoded identity to every request downstream
    req.user = {
      sub: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}
