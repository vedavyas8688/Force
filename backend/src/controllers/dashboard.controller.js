import * as dashboardService from "../services/dashboard/dashboard.service.js";

export async function dashboardSummaryHandler(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary({
      organizationId: req.organizationId,
      user: req.user,
    });

    res.json(summary);
  } catch (err) {
    next(err);
  }
}
