import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { configuration } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

type ConfigRow = typeof configuration.$inferSelect;

/**
 * Get configuration for a workspace, optionally scoped to a branch.
 * Falls back to workspace-level config if branch-specific config is not found.
 */
export async function getWorkspaceConfig(
  workspaceId: string,
  branchId?: string | null
): Promise<ConfigRow | null> {
  const start = performance.now();
  try {
    // Try branch-scoped config first
    if (branchId) {
      const [branchConfig] = await db
        .select()
        .from(configuration)
        .where(
          and(
            eq(configuration.workspaceId, workspaceId),
            eq(configuration.branchId, branchId)
          )
        )
        .limit(1);

      if (branchConfig) {
        logger.debug(
          { fn: "getWorkspaceConfig", workspaceId, branchId, ms: Math.round(performance.now() - start) },
          "DAL query complete (branch-scoped)"
        );
        return branchConfig;
      }
    }

    // Fallback: workspace-level config (branchId IS NULL)
    const rows = await db
      .select()
      .from(configuration)
      .where(eq(configuration.workspaceId, workspaceId));

    // Pick the row where branchId is null (workspace-level), or first available
    const wsConfig = rows.find((r) => r.branchId === null) ?? rows[0] ?? null;

    logger.debug(
      { fn: "getWorkspaceConfig", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL query complete (workspace-level)"
    );
    return wsConfig;
  } catch (err) {
    logger.error({ err, fn: "getWorkspaceConfig", workspaceId }, "DAL query failed");
    throw err;
  }
}

/**
 * Upsert configuration for a workspace (optionally branch-scoped).
 * Uses a select-then-insert/update pattern since Drizzle PG
 * doesn't have onConflict on non-unique columns.
 */
export async function upsertWorkspaceConfig(
  workspaceId: string,
  branchId: string | null,
  data: Partial<Pick<ConfigRow, "kioskPin" | "themeMode" | "defaultPlanId">>
): Promise<ConfigRow> {
  const start = performance.now();
  try {
    // Find existing row
    const conditions = branchId
      ? and(eq(configuration.workspaceId, workspaceId), eq(configuration.branchId, branchId))
      : eq(configuration.workspaceId, workspaceId);

    const [existing] = await db
      .select()
      .from(configuration)
      .where(conditions)
      .limit(1);

    let result: ConfigRow;

    if (existing) {
      const [updated] = await db
        .update(configuration)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(configuration.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(configuration)
        .values({
          workspaceId,
          branchId,
          ...data,
        })
        .returning();
      result = inserted;
    }

    logger.debug(
      { fn: "upsertWorkspaceConfig", workspaceId, branchId, ms: Math.round(performance.now() - start) },
      existing ? "DAL update complete" : "DAL insert complete"
    );
    return result;
  } catch (err) {
    logger.error({ err, fn: "upsertWorkspaceConfig", workspaceId }, "DAL upsert failed");
    throw err;
  }
}
