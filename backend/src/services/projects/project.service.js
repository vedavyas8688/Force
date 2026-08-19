import { Project } from "../../models/project.model.js";

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
  const project = await Project.findOneAndUpdate(
    { _id: projectId, organizationId },
    {
      $set: {
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.status ? { status: updates.status } : {}),
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
