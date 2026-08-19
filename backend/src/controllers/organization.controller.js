import * as organizationService from "../services/organizations/organization.service.js";

export async function getOrganizationSettingsHandler(req, res, next) {
  try {
    const settings = await organizationService.getOrganizationSettings({
      organizationId: req.organizationId,
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
}

export async function updateAssignmentSettingsHandler(req, res, next) {
  try {
    const { defaultStrategy } = req.body;

    if (!defaultStrategy) {
      return res.status(400).json({ error: "Missing default strategy" });
    }

    const assignmentSettings = await organizationService.updateAssignmentSettings({
      organizationId: req.organizationId,
      defaultStrategy,
    });

    res.json({ assignmentSettings });
  } catch (err) {
    next(err);
  }
}
