import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDatabase } from "./config/database.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGINS || "")
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

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", routes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  });
