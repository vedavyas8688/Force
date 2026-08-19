import { Router } from "express";
import {
  getOrganizationSettingsHandler,
  updateAssignmentSettingsHandler,
} from "../controllers/organization.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { attachTenant } from "../middleware/tenant.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth, attachTenant);

router.get("/settings", requireRole("admin"), getOrganizationSettingsHandler);
router.patch(
  "/settings/assignment",
  requireRole("admin"),
  updateAssignmentSettingsHandler
);

export default router;
