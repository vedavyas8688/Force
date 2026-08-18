import { Router } from "express";
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  verifyOtpHandler,
  logoutHandler,
  meHandler,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public
router.post("/signup", signupHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/verify-otp", verifyOtpHandler);

// Protected (needs a valid access token)
router.post("/logout", requireAuth, logoutHandler);
router.get("/me", requireAuth, meHandler);

export default router;
