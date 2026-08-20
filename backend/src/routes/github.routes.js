import { Router } from "express";
import {
  connectProjectRepositoryHandler,
  connectProjectOAuthRepositoryHandler,
  disconnectGithubConnectionHandler,
  disconnectProjectRepositoryHandler,
  getGithubConnectUrlHandler,
  getGithubOAuthUrlHandler,
  getGithubStatusHandler,
  githubInstallCallbackHandler,
  githubOAuthCallbackHandler,
  listGithubOAuthRepositoriesHandler,
  listGithubRepositoriesHandler,
  saveGithubInstallationHandler,
} from "../controllers/github.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/permissions.js";
import { attachTenant } from "../middleware/tenant.js";

const router = Router();

router.get("/callback", githubInstallCallbackHandler);
router.get("/oauth/callback", githubOAuthCallbackHandler);

router.use(requireAuth, attachTenant, requireRole("admin"));

router.get("/connect-url", getGithubConnectUrlHandler);
router.get("/oauth/connect-url", getGithubOAuthUrlHandler);
router.get("/status", getGithubStatusHandler);
router.post("/installations", saveGithubInstallationHandler);
router.get("/oauth/connections/:connectionId/repositories", listGithubOAuthRepositoriesHandler);
router.delete("/oauth/connections/:connectionId", disconnectGithubConnectionHandler);
router.get("/installations/:installationId/repositories", listGithubRepositoriesHandler);
router.patch("/projects/:projectId/oauth-repository", connectProjectOAuthRepositoryHandler);
router.patch("/projects/:projectId/repository", connectProjectRepositoryHandler);
router.delete("/projects/:projectId/repository", disconnectProjectRepositoryHandler);

export default router;
