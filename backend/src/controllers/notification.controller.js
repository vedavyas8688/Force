import { verifyAccessToken } from "../services/auth/token.service.js";
import * as notificationService from "../services/notifications/notification.service.js";
import { addNotificationStream } from "../services/notifications/notification.stream.js";

export async function listNotificationsHandler(req, res, next) {
  try {
    const data = await notificationService.listNotifications({
      organizationId: req.user.organizationId,
      user: req.user,
      limit: req.query.limit,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function markNotificationReadHandler(req, res, next) {
  try {
    const notification = await notificationService.markNotificationRead({
      organizationId: req.user.organizationId,
      user: req.user,
      notificationId: req.params.id,
    });

    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsReadHandler(req, res, next) {
  try {
    const data = await notificationService.markAllNotificationsRead({
      organizationId: req.user.organizationId,
      user: req.user,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export function notificationStreamHandler(req, res) {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: "Missing stream token" });
  }

  try {
    const payload = verifyAccessToken(token);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    addNotificationStream(payload.sub, res);
  } catch {
    return res.status(401).json({ error: "Invalid or expired stream token" });
  }
}
