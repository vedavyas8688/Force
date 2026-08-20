import { Router } from "express";
import {
  addGlobalInternalNoteHandler,
  addGlobalTicketCommentHandler,
  globalTicketOverviewHandler,
  reviewGlobalReopenRequestHandler,
  updateGlobalTicketStatusHandler,
} from "../controllers/admin-ticket.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth, requireRole("super_admin"));

router.get("/overview", globalTicketOverviewHandler);
router.patch("/:id/status", updateGlobalTicketStatusHandler);
router.post("/:id/comments", addGlobalTicketCommentHandler);
router.post("/:id/internal-notes", addGlobalInternalNoteHandler);
router.patch("/:id/reopen-requests/:requestId", reviewGlobalReopenRequestHandler);

export default router;
