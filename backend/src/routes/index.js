import { Router } from "express";
import adminTicketRoutes from "./admin-ticket.routes.js";
import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import githubRoutes from "./github.routes.js";
import organizationRoutes from "./organization.routes.js";
import platformRoutes from "./platform.routes.js";
import projectRoutes from "./project.routes.js";
import ticketRoutes from "./ticket.routes.js";
import userRoutes from "./user.routes.js";
import webhookRoutes from "./webhook.routes.js";
import { requireAuth } from "../middleware/auth.js";
import { attachTenant } from "../middleware/tenant.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin/tickets", adminTicketRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/github", githubRoutes);
router.use("/organizations", organizationRoutes);
router.use("/platform", platformRoutes);
router.use("/projects", projectRoutes);
router.use("/tickets", ticketRoutes);
router.use("/users", userRoutes);
router.use("/webhooks", webhookRoutes);

// Temporary protected route to verify auth + tenant middleware.
// Move this into an organizations module when that feature grows.
router.get("/organizations/me", requireAuth, attachTenant, (req, res) => {
  res.json({ organizationId: req.organizationId, role: req.user.role });
});

export default router;
