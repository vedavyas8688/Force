import { createGithubInstallationOctokit } from "../../config/github.js";
import { CodeFile } from "../../models/code-file.model.js";
import { Commit } from "../../models/commit.model.js";
import { GitConnection } from "../../models/git-connection.model.js";
import { GitHubInstallation } from "../../models/github-installation.model.js";
import { Project } from "../../models/project.model.js";
import { decryptSecret } from "./github.service.js";
import { Octokit } from "@octokit/rest";

const supportedExtensions = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".html", ".md", ".mjs", ".cjs",
]);
const maxFileBytes = 120000;

export async function processGithubSyncJob(job) {
  if (job.name === "sync-repository") {
    return syncProjectRepository(job.data.projectId);
  }

  if (job.name === "sync-push") {
    return syncRepositoryByInstallationAndName(job.data.installationId, job.data.repositoryFullName);
  }

  if (job.name === "pull-request") {
    return { skipped: true, reason: "pull_request_metadata_only" };
  }

  return { skipped: true, reason: "unknown_job" };
}

export async function syncProjectRepository(projectId) {
  const project = await Project.findById(projectId);
  if (!project?.repository?.fullName || !project.repository.installationId) {
    if (!project?.repository?.fullName || !project.repository.gitConnectionId) {
      return { skipped: true, reason: "repository_not_connected" };
    }
  }

  if (!project.repository.installationId && !project.repository.gitConnectionId) {
    return { skipped: true, reason: "repository_not_connected" };
  }

  return syncProject(project);
}

async function syncRepositoryByInstallationAndName(installationId, repositoryFullName) {
  const installation = await GitHubInstallation.findOne({
    installationId: Number(installationId),
    status: "active",
  }).lean();
  if (!installation) return { skipped: true, reason: "installation_not_found" };

  const projects = await Project.find({
    organizationId: installation.organizationId,
    "repository.installationId": Number(installationId),
    "repository.fullName": repositoryFullName,
  });

  const results = [];
  for (const project of projects) {
    results.push(await syncProject(project));
  }
  return { synced: results.length, results };
}

async function syncProject(project) {
  project.repository.syncStatus = "syncing";
  project.repository.syncError = "";
  await project.save();

  try {
    const octokit = await createProjectOctokit(project);
    const [owner, repo] = project.repository.fullName.split("/");
    const branch = project.repository.defaultBranch || "main";

    const { data: branchData } = await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
      owner,
      repo,
      branch,
    });

    const latestSha = branchData.commit.sha;
    const treeSha = branchData.commit.commit?.tree?.sha || latestSha;
    await syncCommits({ octokit, project, owner, repo, latestSha });
    await syncFileTree({ octokit, project, owner, repo, treeSha });

    project.repository.lastCommitSha = latestSha;
    project.repository.lastSyncedAt = new Date();
    project.repository.syncStatus = "synced";
    project.repository.syncError = "";
    await project.save();

    return { projectId: String(project._id), latestSha };
  } catch (err) {
    project.repository.syncStatus = "failed";
    project.repository.syncError = err.message;
    await project.save();
    throw err;
  }
}

async function createProjectOctokit(project) {
  if (project.repository.installationId) {
    return createGithubInstallationOctokit(project.repository.installationId);
  }

  const connection = await GitConnection.findOne({
    _id: project.repository.gitConnectionId,
    organizationId: project.organizationId,
    provider: "github",
    status: "active",
  })
    .select("+encryptedAccessToken")
    .lean();

  if (!connection) {
    const err = new Error("GitHub OAuth connection not found");
    err.status = 404;
    throw err;
  }

  return new Octokit({ auth: decryptSecret(connection.encryptedAccessToken) });
}

async function syncCommits({ octokit, project, owner, repo, latestSha }) {
  const { data: commits } = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner,
    repo,
    sha: latestSha,
    per_page: 25,
  });

  for (const item of commits) {
    const { data: commitDetail } = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
      owner,
      repo,
      ref: item.sha,
    });

    await Commit.findOneAndUpdate(
      { projectId: project._id, sha: item.sha },
      {
        $set: {
          organizationId: project.organizationId,
          projectId: project._id,
          installationId: project.repository.installationId,
          repositoryFullName: project.repository.fullName,
          sha: item.sha,
          message: item.commit?.message || "",
          author: {
            name: item.commit?.author?.name || "",
            email: item.commit?.author?.email || "",
            username: item.author?.login || "",
          },
          timestamp: item.commit?.author?.date ? new Date(item.commit.author.date) : null,
          filesChanged: (commitDetail.files || []).map((file) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
          })),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function syncFileTree({ octokit, project, owner, repo, treeSha }) {
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  const files = (data.tree || []).filter((item) =>
    item.type === "blob" &&
    item.size <= maxFileBytes &&
    supportedExtensions.has(extensionOf(item.path))
  );

  for (const file of files.slice(0, 300)) {
    const { data: blob } = await octokit.request("GET /repos/{owner}/{repo}/git/blobs/{file_sha}", {
      owner,
      repo,
      file_sha: file.sha,
    });
    const content = blob.encoding === "base64"
      ? Buffer.from(blob.content, "base64").toString("utf8")
      : "";

    await CodeFile.findOneAndUpdate(
      { projectId: project._id, path: file.path },
      {
        $set: {
          organizationId: project.organizationId,
          projectId: project._id,
          repositoryFullName: project.repository.fullName,
          path: file.path,
          sha: file.sha,
          size: file.size || 0,
          language: extensionOf(file.path).slice(1),
          content,
          syncedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

function extensionOf(path) {
  const match = path.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : "";
}
