import crypto from "node:crypto";
import { getGithubConfig, getGithubInstallUrl, createGithubAppOctokit, createGithubInstallationOctokit } from "../../config/github.js";
import { GitHubInstallation } from "../../models/github-installation.model.js";
import { Project } from "../../models/project.model.js";
import { enqueueGithubSyncJob } from "./github.queue.js";

export function getGithubStatus() {
  const config = getGithubConfig();
  const missingConfig = [];

  if (!config.appId) missingConfig.push("GITHUB_APP_ID");
  if (!config.privateKey) missingConfig.push("GITHUB_PRIVATE_KEY_PATH");
  if (!config.webhookSecret) missingConfig.push("GITHUB_WEBHOOK_SECRET");
  if (!config.appSlug) missingConfig.push("GITHUB_APP_SLUG");

  return {
    configured: Boolean(config.appId && config.privateKey),
    webhookReady: Boolean(config.webhookSecret),
    appId: config.appId || "",
    clientId: config.clientId || "",
    hasPrivateKey: Boolean(config.privateKey),
    hasWebhookSecret: Boolean(config.webhookSecret),
    installUrl: getGithubInstallUrl(),
    appSlugMissing: !config.appSlug,
    missingConfig,
  };
}

export async function listInstallations({ organizationId }) {
  return GitHubInstallation.find({ organizationId }).sort({ updatedAt: -1 }).lean();
}

export async function saveInstallation({ organizationId, installationId }) {
  if (!installationId) {
    const err = new Error("Missing GitHub installation id");
    err.status = 400;
    throw err;
  }

  const octokit = createGithubAppOctokit();
  const { data } = await octokit.request("GET /app/installations/{installation_id}", {
    installation_id: Number(installationId),
  });

  const installation = await GitHubInstallation.findOneAndUpdate(
    { installationId: Number(installationId) },
    {
      $set: {
        organizationId,
        installationId: Number(installationId),
        githubAccountLogin: data.account?.login || "unknown",
        status: data.suspended_at ? "suspended" : "active",
        installedAt: data.created_at ? new Date(data.created_at) : new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return installation;
}

export async function listInstallationRepositories({ organizationId, installationId }) {
  const installation = await GitHubInstallation.findOne({
    organizationId,
    installationId: Number(installationId),
    status: "active",
  }).lean();

  if (!installation) {
    const err = new Error("GitHub installation not found");
    err.status = 404;
    throw err;
  }

  const octokit = createGithubInstallationOctokit(Number(installationId));
  const { data } = await octokit.request("GET /installation/repositories", {
    per_page: 100,
  });

  return data.repositories.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    owner: repo.owner?.login || "",
    name: repo.name,
    defaultBranch: repo.default_branch || "main",
    private: repo.private,
  }));
}

export async function connectProjectRepository({ organizationId, projectId, installationId, fullName, defaultBranch }) {
  const normalizedFullName = String(fullName || "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalizedFullName)) {
    const err = new Error("Repository must be in owner/repo format");
    err.status = 400;
    throw err;
  }

  await saveInstallation({ organizationId, installationId });
  const [owner, name] = normalizedFullName.split("/");

  const project = await Project.findOneAndUpdate(
    { _id: projectId, organizationId },
    {
      $set: {
        "repository.provider": "github",
        "repository.fullName": normalizedFullName,
        "repository.owner": owner,
        "repository.name": name,
        "repository.defaultBranch": defaultBranch || "main",
        "repository.installationId": Number(installationId),
        "repository.syncStatus": "connected",
        "repository.syncError": "",
      },
    },
    { new: true }
  ).lean();

  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  await enqueueGithubSyncJob("sync-repository", {
    organizationId: String(organizationId),
    projectId: String(project._id),
    reason: "repository_connected",
  });

  return project;
}

export async function disconnectProjectRepository({ organizationId, projectId }) {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, organizationId },
    {
      $set: {
        "repository.fullName": "",
        "repository.owner": "",
        "repository.name": "",
        "repository.defaultBranch": "main",
        "repository.installationId": null,
        "repository.lastCommitSha": "",
        "repository.lastSyncedAt": null,
        "repository.syncStatus": "not_connected",
        "repository.syncError": "",
      },
    },
    { new: true }
  ).lean();

  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  return project;
}

export function verifyGithubWebhookSignature({ rawBody, signature }) {
  const secret = getGithubConfig().webhookSecret;
  if (!secret || !signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function handleGithubWebhook({ event, payload }) {
  if (event === "installation") {
    await updateInstallationFromWebhook(payload);
  }

  if (event === "installation_repositories") {
    await updateInstallationFromWebhook(payload);
  }

  if (event === "push") {
    await enqueueGithubSyncJob("sync-push", {
      installationId: payload.installation?.id,
      repositoryFullName: payload.repository?.full_name,
      after: payload.after,
      reason: "push_webhook",
    });
  }

  if (event === "pull_request") {
    await enqueueGithubSyncJob("pull-request", {
      installationId: payload.installation?.id,
      repositoryFullName: payload.repository?.full_name,
      pullRequestNumber: payload.pull_request?.number,
      action: payload.action,
      reason: "pull_request_webhook",
    });
  }

  return { accepted: true, event };
}

async function updateInstallationFromWebhook(payload) {
  const installationId = payload.installation?.id;
  if (!installationId) return;

  const existing = await GitHubInstallation.findOne({ installationId });
  if (!existing) return;

  existing.githubAccountLogin = payload.installation?.account?.login || existing.githubAccountLogin;
  existing.status = payload.action === "deleted" ? "deleted" : "active";
  await existing.save();
}
