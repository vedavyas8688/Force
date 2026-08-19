import * as projectService from "../services/projects/project.service.js";

export async function listProjectsHandler(req, res, next) {
  try {
    const projects = await projectService.listProjects({ organizationId: req.organizationId });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function createProjectHandler(req, res, next) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing project name" });
    }

    const project = await projectService.createProject({
      organizationId: req.organizationId,
      name,
      description,
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectHandler(req, res, next) {
  try {
    const project = await projectService.updateProject({
      organizationId: req.organizationId,
      projectId: req.params.id,
      updates: req.body,
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectHandler(req, res, next) {
  try {
    const deleted = await projectService.deleteProject({
      organizationId: req.organizationId,
      projectId: req.params.id,
    });

    res.json({ deleted });
  } catch (err) {
    next(err);
  }
}
