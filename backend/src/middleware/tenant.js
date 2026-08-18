/**
 * Must run AFTER requireAuth.
 * Ensures every request carries a resolved organizationId, and gives
 * downstream services one place to pull it from (req.organizationId)
 * instead of re-reading req.user everywhere.
 */
export function attachTenant(req, res, next) {
  if (!req.user || !req.user.organizationId) {
    return res.status(403).json({ error: "No organization context on this request" });
  }
  req.organizationId = req.user.organizationId;
  next();
}

/**
 * Use on routes that load a specific resource (e.g. /tickets/:id) to confirm
 * the resource actually belongs to the caller's organization.
 * `loader` should fetch the resource and return it (or null).
 */
export function requireOwnership(loader) {
  return async (req, res, next) => {
    try {
      const resource = await loader(req);
      if (!resource) {
        return res.status(404).json({ error: "Not found" });
      }
      if (String(resource.organizationId) !== String(req.organizationId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}
