import { Router } from "express";
import { dashboardSummaryHandler } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { attachTenant } from "../middleware/tenant.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth, attachTenant);

router.get("/summary", requireRole("admin", "customer", "developer"), dashboardSummaryHandler);

export default router;
