import "dotenv/config";
import { app } from "../src/app.js";

export default async function handler(req, res) {
  if (req.url === "/api/index" || req.url?.startsWith("/api/index?")) {
    req.url = req.url.replace("/api/index", "/");
  }

  return app(req, res);
}
