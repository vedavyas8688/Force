import * as githubService from "../services/github/github.service.js";

export async function getGithubStatusHandler(req, res, next) {
  try {
    const [status, installations] = await Promise.all([
      githubService.getGithubStatus(),
      githubService.listInstallations({ organizationId: req.organizationId }),
    ]);

    res.json({ status, installations });
  } catch (err) {
    next(err);
  }
}

export async function saveGithubInstallationHandler(req, res, next) {
  try {
    const installation = await githubService.saveInstallation({
      organizationId: req.organizationId,
      installationId: req.body.installationId,
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

export async function connectProjectRepositoryHandler(req, res, next) {
  try {
    const project = await githubService.connectProjectRepository({
      organizationId: req.organizationId,
      projectId: req.params.projectId,
      installationId: req.body.installationId,
      fullName: req.body.fullName,
      defaultBranch: req.body.defaultBranch,
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
