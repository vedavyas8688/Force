import crypto from "node:crypto";
import { Octokit } from "@octokit/rest";
import { getGithubConfig, getGithubInstallUrl, createGithubAppOctokit, createGithubInstallationOctokit } from "../../config/github.js";
import { GitConnection } from "../../models/git-connection.model.js";
import { GitHubInstallation } from "../../models/github-installation.model.js";
import { GitHubOAuthState } from "../../models/github-oauth-state.model.js";
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

export async function listGitConnections({ organizationId }) {
  return GitConnection.find({ organizationId, provider: "github", status: "active" })
    .sort({ updatedAt: -1 })
    .select("_id provider providerUserId providerUsername scopes status connectedAt lastSyncAt updatedAt")
    .lean();
}

export async function createGithubOAuthUrl({ organizationId, user }) {
  const config = getGithubConfig();
  if (!config.clientId || !config.clientSecret) {
    const err = new Error("GitHub OAuth client is not configured");
    err.status = 400;
    throw err;
  }

  const state = crypto.randomBytes(32).toString("hex");
  await GitHubOAuthState.create({
    stateHash: hashState(state),
    organizationId,
    userId: user.sub,
    role: user.role,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  const redirectBase = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", new URL("/api/github/oauth/callback", redirectBase).toString());
  url.searchParams.set("scope", "read:user user:email repo");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

export async function completeGithubOAuthCallback({ code, state }) {
  if (!code) {
    const err = new Error("Missing GitHub OAuth code");
    err.status = 400;
    throw err;
  }

  const stateRecord = await consumeGithubState(state);
  const config = getGithubConfig();

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
  });
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    const err = new Error(tokenData.error_description || "GitHub OAuth token exchange failed");
    err.status = 400;
    throw err;
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenData.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const githubUser = await userResponse.json();

  if (!userResponse.ok || !githubUser.id) {
    const err = new Error(githubUser.message || "Could not load GitHub account");
    err.status = 400;
    throw err;
  }

  const connection = await GitConnection.findOneAndUpdate(
    {
      organizationId: stateRecord.organizationId,
      provider: "github",
      providerUserId: String(githubUser.id),
    },
    {
      $set: {
        organizationId: stateRecord.organizationId,
        provider: "github",
        providerUserId: String(githubUser.id),
        providerUsername: githubUser.login,
        encryptedAccessToken: encryptSecret(tokenData.access_token),
        scopes: String(tokenData.scope || "")
          .split(",")
          .map((scope) => scope.trim())
          .filter(Boolean),
        status: "active",
        connectedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    connection,
    actor: {
      sub: stateRecord.userId,
      role: stateRecord.role,
    },
  };
}

export async function listOAuthRepositories({ organizationId, connectionId }) {
  const connection = await GitConnection.findOne({
    _id: connectionId,
    organizationId,
    provider: "github",
    status: "active",
  })
    .select("+encryptedAccessToken")
    .lean();

  if (!connection) {
    const err = new Error("GitHub connection not found");
    err.status = 404;
    throw err;
  }

  const octokit = new Octokit({ auth: decryptSecret(connection.encryptedAccessToken) });
  const { data } = await octokit.request("GET /user/repos", {
    per_page: 100,
    sort: "updated",
    affiliation: "owner,collaborator,organization_member",
  });

  return data.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    owner: repo.owner?.login || "",
    name: repo.name,
    defaultBranch: repo.default_branch || "main",
    private: repo.private,
  }));
}

export async function createGithubConnectUrl({ organizationId, user }) {
  const installUrl = getGithubInstallUrl();
  if (!installUrl) {
    const err = new Error("GitHub install URL is not configured");
    err.status = 400;
    throw err;
  }

  const state = crypto.randomBytes(32).toString("hex");
  const stateHash = hashState(state);

  await GitHubOAuthState.create({
    stateHash,
    organizationId,
    userId: user.sub,
    role: user.role,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  const url = new URL(installUrl);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function completeGithubInstallCallback({ installationId, state }) {
  const stateRecord = state
    ? await GitHubOAuthState.findOne({
        stateHash: hashState(state),
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
    : null;

  if (!stateRecord) {
    const err = new Error("Invalid or expired GitHub connection state");
    err.status = 401;
    throw err;
  }

  if (stateRecord.role !== "admin") {
    const err = new Error("Invalid GitHub connection state");
    err.status = 403;
    throw err;
  }

  stateRecord.usedAt = new Date();
  await stateRecord.save();

  const installation = await saveInstallation({
    organizationId: stateRecord.organizationId,
    installationId,
  });

  return {
    installation,
    actor: {
      sub: stateRecord.userId,
      role: stateRecord.role,
    },
  };
}

export async function saveInstallation({ organizationId, installationId }) {
  if (!installationId) {
    const err = new Error("Missing GitHub installation id");
    err.status = 400;
    throw err;
  }

  const normalizedInstallationId = Number(installationId);
  const existing = await GitHubInstallation.findOne({ installationId: normalizedInstallationId })
    .select("organizationId")
    .lean();

  if (existing && String(existing.organizationId) !== String(organizationId)) {
    const err = new Error("GitHub installation already belongs to another organization");
    err.status = 409;
    throw err;
  }

  const octokit = createGithubAppOctokit();
  const { data } = await octokit.request("GET /app/installations/{installation_id}", {
    installation_id: normalizedInstallationId,
  });

  const installation = await GitHubInstallation.findOneAndUpdate(
    { installationId: normalizedInstallationId },
    {
      $set: {
        organizationId,
        installationId: normalizedInstallationId,
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

export async function connectProjectOAuthRepository({ organizationId, projectId, gitConnectionId, fullName, defaultBranch }) {
  const normalizedFullName = String(fullName || "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalizedFullName)) {
    const err = new Error("Repository must be in owner/repo format");
    err.status = 400;
    throw err;
  }

  const connection = await GitConnection.findOne({
    _id: gitConnectionId,
    organizationId,
    provider: "github",
    status: "active",
  }).lean();

  if (!connection) {
    const err = new Error("GitHub connection not found");
    err.status = 404;
    throw err;
  }

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
        "repository.gitConnectionId": connection._id,
        "repository.installationId": null,
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
    gitConnectionId: String(connection._id),
    reason: "oauth_repository_connected",
  });

  return project;
}

export async function disconnectGitConnection({ organizationId, connectionId }) {
  const connection = await GitConnection.findOneAndUpdate(
    {
      _id: connectionId,
      organizationId,
      provider: "github",
      status: "active",
    },
    {
      $set: {
        status: "disconnected",
        encryptedAccessToken: "disconnected",
      },
    },
    { new: true }
  ).lean();

  if (!connection) {
    const err = new Error("GitHub connection not found");
    err.status = 404;
    throw err;
  }

  const projects = await Project.updateMany(
    {
      organizationId,
      "repository.gitConnectionId": connection._id,
    },
    {
      $set: {
        "repository.fullName": "",
        "repository.owner": "",
        "repository.name": "",
        "repository.defaultBranch": "main",
        "repository.installationId": null,
        "repository.gitConnectionId": null,
        "repository.lastCommitSha": "",
        "repository.lastSyncedAt": null,
        "repository.syncStatus": "not_connected",
        "repository.syncError": "",
      },
    }
  );

  return {
    connection,
    projectsUpdated: projects.modifiedCount || 0,
  };
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
        "repository.gitConnectionId": null,
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
    .update(rawBody || Buffer.from(""))
    .digest("hex")}`;

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
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

function hashState(state) {
  return crypto.createHash("sha256").update(String(state)).digest("hex");
}

async function consumeGithubState(state) {
  const stateRecord = state
    ? await GitHubOAuthState.findOne({
        stateHash: hashState(state),
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
    : null;

  if (!stateRecord) {
    const err = new Error("Invalid or expired GitHub connection state");
    err.status = 401;
    throw err;
  }

  if (stateRecord.role !== "admin") {
    const err = new Error("Invalid GitHub connection state");
    err.status = 403;
    throw err;
  }

  stateRecord.usedAt = new Date();
  await stateRecord.save();

  return stateRecord;
}

function encryptionKey() {
  return crypto
    .createHash("sha256")
    .update(process.env.INTEGRATION_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || "force-dev-key")
    .digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(value) {
  const [ivText, tagText, encryptedText] = String(value).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
