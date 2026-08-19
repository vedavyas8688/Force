import { Project } from "../../models/project.model.js";
import { Ticket } from "../../models/ticket.model.js";

export async function listProjects({ organizationId }) {
  return Project.find({ organizationId }).sort({ createdAt: -1 }).lean();
}

export async function createProject({ organizationId, name, description }) {
  return Project.create({
    organizationId,
    name,
    description,
  });
}

export async function updateProject({ organizationId, projectId, updates }) {
  const repositoryUpdates = buildRepositoryUpdates(updates.repository);

  const project = await Project.findOneAndUpdate(
    { _id: projectId, organizationId },
    {
      $set: {
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...repositoryUpdates,
      },
    },
    { new: true }
  );

  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  return project;
}

export async function deleteProject({ organizationId, projectId }) {
  const ticketCount = await Ticket.countDocuments({ organizationId, projectId });
  if (ticketCount > 0) {
    const err = new Error("Project has tickets. Archive it instead of deleting history.");
    err.status = 400;
    throw err;
  }

  const project = await Project.findOneAndDelete({ _id: projectId, organizationId }).lean();
  if (!project) {
    const err = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  return { id: project._id, name: project.name };
}

function buildRepositoryUpdates(repository) {
  if (!repository) return {};

  const updates = {};

  if (repository.provider !== undefined) {
    updates["repository.provider"] = repository.provider || "github";
  }

  if (repository.fullName !== undefined) {
    const fullName = String(repository.fullName || "").trim();
    const [owner = "", name = ""] = fullName.split("/");
    updates["repository.fullName"] = fullName;
    updates["repository.owner"] = owner;
    updates["repository.name"] = name;
    updates["repository.syncStatus"] = fullName ? "connected" : "not_connected";
    if (!fullName) {
      updates["repository.installationId"] = null;
      updates["repository.lastCommitSha"] = "";
      updates["repository.lastSyncedAt"] = null;
      updates["repository.syncError"] = "";
    }
  }

  if (repository.defaultBranch !== undefined) {
    updates["repository.defaultBranch"] = String(repository.defaultBranch || "main").trim();
  }

  if (repository.installationId !== undefined) {
    updates["repository.installationId"] = repository.installationId || null;
  }

  return updates;
}
