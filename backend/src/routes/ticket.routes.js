import { Router } from "express";
import {
  addInternalNoteHandler,
  addTicketCommentHandler,
  assignTicketHandler,
  autoAssignTicketHandler,
  autoAssignUnassignedTicketsHandler,
  createTicketHandler,
  getTicketHandler,
  listTicketsHandler,
  requestReopenHandler,
  reviewReopenRequestHandler,
  updateTicketStatusHandler,
} from "../controllers/ticket.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { attachTenant } from "../middleware/tenant.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth, attachTenant);

router.get("/", requireRole("admin", "customer", "developer"), listTicketsHandler);
router.post("/", requireRole("customer"), createTicketHandler);
router.post("/auto-assign", requireRole("admin"), autoAssignUnassignedTicketsHandler);
router.get("/:id", requireRole("admin", "customer", "developer"), getTicketHandler);
router.post("/:id/comments", requireRole("admin", "customer", "developer"), addTicketCommentHandler);
router.post("/:id/internal-notes", requireRole("admin", "developer"), addInternalNoteHandler);
router.post("/:id/reopen-requests", requireRole("customer"), requestReopenHandler);
router.patch("/:id/reopen-requests/:requestId", requireRole("admin"), reviewReopenRequestHandler);
router.patch("/:id/status", requireRole("admin", "customer", "developer"), updateTicketStatusHandler);
router.patch("/:id/assign", requireRole("admin"), assignTicketHandler);
router.patch("/:id/auto-assign", requireRole("admin"), autoAssignTicketHandler);

export default router;
