import { Types } from "mongoose";
import { AuditLog } from "@/models";
import type { AuthUser } from "@/types";

export async function writeAudit(input: {
  actor: AuthUser;
  action: string;
  entityType: string;
  entityId?: string | Types.ObjectId | null;
  summary: string;
  meta?: Record<string, unknown>;
  adminId?: string | Types.ObjectId | null;
  ip?: string;
}) {
  try {
    await AuditLog.create({
      actorId: input.actor.id,
      actorRole: input.actor.role,
      adminId:
        input.adminId ||
        input.actor.adminId ||
        (input.actor.role === "admin" ? input.actor.id : undefined),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || undefined,
      summary: input.summary,
      meta: input.meta,
      ip: input.ip,
    });
  } catch (error) {
    // Never block primary business actions on audit failures
    console.error("[audit]", error);
  }
}
