import { Router } from "express";
import { platformOverviewHandler } from "../controllers/platform.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth, requireRole("super_admin"));

router.get("/overview", platformOverviewHandler);

export default router;
