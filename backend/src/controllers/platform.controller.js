import * as platformService from "../services/platform/platform.service.js";

export async function platformOverviewHandler(req, res, next) {
  try {
    const overview = await platformService.getPlatformOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
}

export async function createOrganizationAdminHandler(req, res, next) {
  try {
    const { organizationName, adminName, email } = req.body;

    if (!organizationName || !adminName || !email) {
      return res.status(400).json({ error: "Missing organization name, admin name, or email" });
    }

    const result = await platformService.createOrganizationAdmin({
      organizationName,
      adminName,
      email,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteOrganizationHandler(req, res, next) {
  try {
    const removed = await platformService.deleteOrganization({
      organizationId: req.params.id,
      actorId: req.user.sub,
    });

    res.json({ removed });
  } catch (err) {
    next(err);
  }
}

export async function approveOrganizationHandler(req, res, next) {
  try {
    const result = await platformService.approveOrganization({
      organizationId: req.params.id,
      actorId: req.user.sub,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
