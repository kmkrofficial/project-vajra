import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/**
 * Insert an audit log entry. This function is fire-and-forget:
 * it will NEVER throw an error that breaks the caller's flow.
 * If the insert fails, we log to pino (captured by Coolify) and move on.
 */
export async function insertAuditLog(data: {
  workspaceId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      workspaceId: data.workspaceId,
      userId: data.userId ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      details: data.details ?? null,
    });
  } catch (err) {
    // Never crash the user's request — log to pino for Coolify capture
    logger.error(
      { err, fn: "insertAuditLog", action: data.action, workspaceId: data.workspaceId },
      "Failed to insert audit log (non-blocking)"
    );
  }
}
