import { Router } from "express";
import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import organizationRoutes from "./organization.routes.js";
import projectRoutes from "./project.routes.js";
import ticketRoutes from "./ticket.routes.js";
import userRoutes from "./user.routes.js";
import { requireAuth } from "../middleware/auth.js";
import { attachTenant } from "../middleware/tenant.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/organizations", organizationRoutes);
router.use("/projects", projectRoutes);
router.use("/tickets", ticketRoutes);
router.use("/users", userRoutes);

// Temporary protected route to verify auth + tenant middleware.
// Move this into an organizations module when that feature grows.
router.get("/organizations/me", requireAuth, attachTenant, (req, res) => {
  res.json({ organizationId: req.organizationId, role: req.user.role });
});

export default router;
