import { Router } from "express";
import {
  acceptInviteHandler,
  inviteUserHandler,
  listUsersHandler,
  removeUserHandler,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { attachTenant } from "../middleware/tenant.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.post("/accept-invite", acceptInviteHandler);

router.use(requireAuth, attachTenant);

router.get("/", requireRole("admin"), listUsersHandler);
router.post("/invite", requireRole("admin"), inviteUserHandler);
router.delete("/:id", requireRole("admin"), removeUserHandler);

export default router;
