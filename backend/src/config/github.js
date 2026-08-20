import fs from "node:fs";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export function getGithubConfig() {
  const privateKey = readPrivateKey();

  return {
    appId: process.env.GITHUB_APP_ID || "",
    appSlug: process.env.GITHUB_APP_SLUG || "",
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
    privateKey,
  };
}

export function assertGithubAppConfigured() {
  const config = getGithubConfig();
  const missing = [];

  if (!config.appId) missing.push("GITHUB_APP_ID");
  if (!config.privateKey) missing.push("GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_PATH");

  if (missing.length > 0) {
    const err = new Error(`Missing GitHub config: ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }

  return config;
}

export function createGithubAppOctokit() {
  const config = assertGithubAppConfigured();

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
      clientId: config.clientId || undefined,
      clientSecret: config.clientSecret || undefined,
    },
  });
}

export function createGithubInstallationOctokit(installationId) {
  const config = assertGithubAppConfigured();

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
      installationId,
      clientId: config.clientId || undefined,
      clientSecret: config.clientSecret || undefined,
    },
  });
}

export function getGithubInstallUrl() {
  const { appSlug } = getGithubConfig();
  return appSlug ? `https://github.com/apps/${appSlug}/installations/new` : "";
}

function readPrivateKey() {
  if (process.env.GITHUB_PRIVATE_KEY_PATH) {
    return fs.readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, "utf8");
  }

  return (process.env.GITHUB_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}
