import express from "express";
import cors from "cors";
import { connectDatabase } from "./config/database.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";

const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CLIENT_ORIGINS || DEFAULT_CLIENT_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({
    limit: process.env.JSON_BODY_LIMIT || "16mb",
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith("/api/webhooks/github")) {
        req.rawBody = buf;
      }
    },
  }));

  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      service: "FORCE backend API",
      health: "/health",
      apiBase: "/api",
    });
  });
  app.get("/api/index", (req, res) => {
    res.json({
      status: "ok",
      service: "FORCE backend API",
      health: "/health",
      apiBase: "/api",
    });
  });

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.get("/api/auth/me", (req, res, next) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing access token" });
    }

    next();
  });

  app.use("/api", async (req, res, next) => {
    try {
      await connectDatabase();
      next();
    } catch (err) {
      next(err);
    }
  });
  app.use("/api", routes);

  app.use(errorHandler);

  return app;
}

export const app = createApp();
