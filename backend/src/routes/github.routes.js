import { Router } from "express";
import {
  connectProjectRepositoryHandler,
  disconnectProjectRepositoryHandler,
  getGithubStatusHandler,
  listGithubRepositoriesHandler,
  saveGithubInstallationHandler,
} from "../controllers/github.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/permissions.js";
import { attachTenant } from "../middleware/tenant.js";

const router = Router();

router.use(requireAuth, attachTenant, requireRole("admin"));

router.get("/status", getGithubStatusHandler);
router.post("/installations", saveGithubInstallationHandler);
router.get("/installations/:installationId/repositories", listGithubRepositoriesHandler);
router.patch("/projects/:projectId/repository", connectProjectRepositoryHandler);
router.delete("/projects/:projectId/repository", disconnectProjectRepositoryHandler);

export default router;
