import { Router } from "express";
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  notificationStreamHandler,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/stream", notificationStreamHandler);

router.use(requireAuth);

router.get("/", listNotificationsHandler);
router.patch("/read-all", markAllNotificationsReadHandler);
router.patch("/:id/read", markNotificationReadHandler);

export default router;
