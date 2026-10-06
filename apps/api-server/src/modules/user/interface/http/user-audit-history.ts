import type { AuditService } from "@/modules/audit/audit.service";

export const USER_AUDIT_HISTORY_LIMIT = 10;

export async function getUserAuditHistory(
  service: Pick<AuditService, "getUserTrail">,
  userId: string,
) {
  const logs = await service.getUserTrail(userId, USER_AUDIT_HISTORY_LIMIT);

  return logs.slice(0, USER_AUDIT_HISTORY_LIMIT).map((log) => ({
    id: log.id,
    action: log.action,
    actorId: log.actorId,
    actorType: log.actorType,
    targetType: log.targetType,
    targetId: log.targetId,
    createdAt: log.createdAt,
    severity: log.severity,
  }));
}