import { Router } from "express";
import { githubWebhookHandler } from "../controllers/github.controller.js";

const router = Router();

router.post("/github", githubWebhookHandler);

export default router;
