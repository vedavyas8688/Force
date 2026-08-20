import { AuditLog } from "../../models/audit-log.model.js";

export async function recordAuditLog({
  organizationId = null,
  actor = null,
  action,
  targetType,
  targetId = "",
  result = "success",
  metadata = {},
}) {
  if (!action || !targetType) return null;

  return AuditLog.create({
    organizationId,
    actorId: actor?.sub || actor?._id || null,
    actorRole: actor?.role || "",
    action,
    targetType,
    targetId: String(targetId || ""),
    result,
    metadata,
  });
}
