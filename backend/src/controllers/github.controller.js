import * as githubService from "../services/github/github.service.js";
import { recordAuditLog } from "../services/audit/audit.service.js";

export async function getGithubStatusHandler(req, res, next) {
  try {
    const [status, installations, connections] = await Promise.all([
      githubService.getGithubStatus(),
      githubService.listInstallations({ organizationId: req.organizationId }),
      githubService.listGitConnections({ organizationId: req.organizationId }),
    ]);

    res.json({ status, installations, connections });
  } catch (err) {
    next(err);
  }
}

export async function getGithubOAuthUrlHandler(req, res, next) {
  try {
    const url = await githubService.createGithubOAuthUrl({
      organizationId: req.organizationId,
      user: req.user,
    });

    res.json({ url });
  } catch (err) {
    next(err);
  }
}

export async function githubOAuthCallbackHandler(req, res, next) {
  const redirectBase = process.env.ADMIN_URL || "http://localhost:3002";

  try {
    const { connection, actor } = await githubService.completeGithubOAuthCallback({
      code: req.query.code,
      state: req.query.state,
    });

    await recordAuditLog({
      organizationId: connection.organizationId,
      actor,
      action: "integration_connected",
      targetType: "git_connection",
      targetId: connection._id,
      metadata: {
        provider: "github",
        account: connection.providerUsername,
      },
    });

    const url = new URL("/integrations", redirectBase);
    url.searchParams.set("github_oauth", "connected");
    res.redirect(url.toString());
  } catch (err) {
    const url = new URL("/integrations", redirectBase);
    url.searchParams.set("github_error", err.message);
    res.redirect(url.toString());
  }
}

export async function getGithubConnectUrlHandler(req, res, next) {
  try {
    const url = await githubService.createGithubConnectUrl({
      organizationId: req.organizationId,
      user: req.user,
    });

    res.json({ url });
  } catch (err) {
    next(err);
  }
}

export async function githubInstallCallbackHandler(req, res, next) {
  const redirectBase = process.env.ADMIN_URL || "http://localhost:3002";
  const state = req.query.state;

  try {
    if (!state) {
      const url = new URL("/integrations", redirectBase);
      url.searchParams.set("github_error", "GitHub connection must be started from FORCE Integrations");
      return res.redirect(url.toString());
    }

    const { installation, actor } = await githubService.completeGithubInstallCallback({
      installationId: req.query.installation_id,
      state,
    });

    await recordAuditLog({
      organizationId: installation.organizationId,
      actor,
      action: "integration_connected",
      targetType: "github_installation",
      targetId: installation._id,
      metadata: {
        provider: "github",
        installationId: installation.installationId,
        account: installation.githubAccountLogin,
      },
    });

    const url = new URL("/integrations", redirectBase);
    url.searchParams.set("github", "connected");
    res.redirect(url.toString());
  } catch (err) {
    const url = new URL("/integrations", redirectBase);
    url.searchParams.set("github_error", err.message);
    res.redirect(url.toString());
  }
}

export async function saveGithubInstallationHandler(req, res, next) {
  try {
    const installation = await githubService.saveInstallation({
      organizationId: req.organizationId,
      installationId: req.body.installationId,
    });

    await recordAuditLog({
      organizationId: req.organizationId,
      actor: req.user,
      action: "integration_connected",
      targetType: "github_installation",
      targetId: installation._id,
      metadata: {
        provider: "github",
        installationId: installation.installationId,
        account: installation.githubAccountLogin,
      },
    });

    res.status(201).json({ installation });
  } catch (err) {
    next(err);
  }
}

export async function listGithubRepositoriesHandler(req, res, next) {
  try {
    const repositories = await githubService.listInstallationRepositories({
      organizationId: req.organizationId,
      installationId: req.params.installationId,
    });

    res.json({ repositories });
  } catch (err) {
    next(err);
  }
}

export async function listGithubOAuthRepositoriesHandler(req, res, next) {
  try {
    const repositories = await githubService.listOAuthRepositories({
      organizationId: req.organizationId,
      connectionId: req.params.connectionId,
    });

    res.json({ repositories });
  } catch (err) {
    next(err);
  }
}

export async function connectProjectOAuthRepositoryHandler(req, res, next) {
  try {
    const project = await githubService.connectProjectOAuthRepository({
      organizationId: req.organizationId,
      projectId: req.params.projectId,
      gitConnectionId: req.body.gitConnectionId,
      fullName: req.body.fullName,
      defaultBranch: req.body.defaultBranch,
    });

    await recordAuditLog({
      organizationId: req.organizationId,
      actor: req.user,
      action: "repository_connected",
      targetType: "project",
      targetId: project._id,
      metadata: {
        provider: "github",
        repository: project.repository?.fullName,
        defaultBranch: project.repository?.defaultBranch,
        connectionType: "oauth",
      },
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function disconnectGithubConnectionHandler(req, res, next) {
  try {
    const result = await githubService.disconnectGitConnection({
      organizationId: req.organizationId,
      connectionId: req.params.connectionId,
    });

    await recordAuditLog({
      organizationId: req.organizationId,
      actor: req.user,
      action: "integration_disconnected",
      targetType: "git_connection",
      targetId: result.connection._id,
      metadata: {
        provider: "github",
        account: result.connection.providerUsername,
        projectsUpdated: result.projectsUpdated,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function connectProjectRepositoryHandler(req, res, next) {
  try {
    const project = await githubService.connectProjectRepository({
      organizationId: req.organizationId,
      projectId: req.params.projectId,
      installationId: req.body.installationId,
      fullName: req.body.fullName,
      defaultBranch: req.body.defaultBranch,
    });

    await recordAuditLog({
      organizationId: req.organizationId,
      actor: req.user,
      action: "repository_connected",
      targetType: "project",
      targetId: project._id,
      metadata: {
        provider: "github",
        repository: project.repository?.fullName,
        defaultBranch: project.repository?.defaultBranch,
      },
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function disconnectProjectRepositoryHandler(req, res, next) {
  try {
    const project = await githubService.disconnectProjectRepository({
      organizationId: req.organizationId,
      projectId: req.params.projectId,
    });

    await recordAuditLog({
      organizationId: req.organizationId,
      actor: req.user,
      action: "repository_disconnected",
      targetType: "project",
      targetId: project._id,
      metadata: {
        provider: "github",
      },
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function githubWebhookHandler(req, res, next) {
  try {
    const valid = githubService.verifyGithubWebhookSignature({
      rawBody: req.rawBody,
      signature: req.get("X-Hub-Signature-256"),
    });

    if (!valid) {
      return res.status(401).json({ error: "Invalid GitHub signature" });
    }

    const result = await githubService.handleGithubWebhook({
      event: req.get("X-GitHub-Event"),
      payload: req.body,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
