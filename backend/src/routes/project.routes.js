import { Router } from "express";
import {
  createProjectHandler,
  deleteProjectHandler,
  listProjectsHandler,
  updateProjectHandler,
} from "../controllers/project.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { attachTenant } from "../middleware/tenant.js";
import { requireRole } from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth, attachTenant);

router.get("/", requireRole("admin", "customer", "developer"), listProjectsHandler);
router.post("/", requireRole("admin"), createProjectHandler);
router.patch("/:id", requireRole("admin"), updateProjectHandler);
router.delete("/:id", requireRole("admin"), deleteProjectHandler);

export default router;
