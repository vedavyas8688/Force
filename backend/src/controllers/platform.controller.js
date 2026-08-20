import * as platformService from "../services/platform/platform.service.js";

export async function platformOverviewHandler(req, res, next) {
  try {
    const overview = await platformService.getPlatformOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
}
