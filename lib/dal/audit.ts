import { db } from "@/lib/db";
import { auditLogs, user } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { eq, desc, and, like } from "drizzle-orm";

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

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  userName: string | null;
  createdAt: Date;
}

/**
 * Fetch audit logs for a workspace, joined with user name.
 * Ordered by most recent first.
 */
export async function getAuditLogs(
  workspaceId: string,
  limit: number = 100,
  actionFilter?: string
): Promise<AuditLogRow[]> {
  const start = performance.now();
  try {
    const conditions = [eq(auditLogs.workspaceId, workspaceId)];
    if (actionFilter) {
      conditions.push(like(auditLogs.action, `%${actionFilter}%`));
    }

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        userName: user.name,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    logger.debug(
      { fn: "getAuditLogs", workspaceId, rowCount: rows.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );

    return rows;
  } catch (err) {
    logger.error({ err, fn: "getAuditLogs", workspaceId }, "DAL query failed");
    throw err;
  }
}
