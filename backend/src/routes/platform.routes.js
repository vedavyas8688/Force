import { Router } from "express";
import {
  approveOrganizationHandler,
  createOrganizationAdminHandler,
  deleteOrganizationHandler,
  platformOverviewHandler,
} from "../controllers/platform.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth, requireRole("super_admin"));

router.get("/overview", platformOverviewHandler);
router.post("/organization-admins", createOrganizationAdminHandler);
router.patch("/organizations/:id/approve", approveOrganizationHandler);
router.delete("/organizations/:id", deleteOrganizationHandler);

export default router;
