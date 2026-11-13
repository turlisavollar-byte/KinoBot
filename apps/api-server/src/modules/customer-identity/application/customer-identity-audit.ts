import type { CreateAuditLogDTO } from "@/modules/audit/audit.types";

export type CustomerIdentityAuditAction =
  "REGISTER" | "LOGIN" | "LOGIN_FAILED" | "LINK" | "LOGOUT";

export interface CustomerIdentityAuditWriter {
  log(dto: CreateAuditLogDTO): Promise<unknown>;
}

export async function writeCustomerIdentityAudit(
  writer: CustomerIdentityAuditWriter,
  input: {
    action: CustomerIdentityAuditAction;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {
  await writer.log({
    actorId: input.userId,
    actorType: "USER",
    action: input.action,
    targetType: "USER",
    targetId: input.userId,
    sessionId: input.sessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    severity: input.action === "LOGIN_FAILED" ? "MEDIUM" : "LOW",
    metadata: { channel: "web_customer_identity" },
  });
}
