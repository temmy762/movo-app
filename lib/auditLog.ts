import { prisma } from "@/lib/prisma";

export type AuditActorType = "ADMIN" | "USER" | "DRIVER" | "SYSTEM";

/** Fire-and-forget audit trail entry. Never throws — logging failures must
    never break the action being logged. */
export async function logAudit(entry: {
  action: string;
  entityType?: string;
  entityId?: string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        detail: (entry.detail ?? undefined) as never,
      },
    });
  } catch (e) {
    console.error("[auditLog]", e);
  }
}
