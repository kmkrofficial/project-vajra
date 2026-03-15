import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/** Get all plans for a workspace, optionally filtered by branch. */
export async function getPlans(workspaceId: string, branchId?: string | null) {
  const start = performance.now();
  try {
    const conditions = [eq(plans.workspaceId, workspaceId)];
    // If branchId provided, show plans for that branch + workspace-wide plans (branchId IS NULL)
    // If no branchId (all branches), show everything
    if (branchId) {
      // Branch-specific: show plans for this branch OR workspace-wide plans
      const result = await db
        .select()
        .from(plans)
        .where(
          and(
            eq(plans.workspaceId, workspaceId),
          )
        )
        .orderBy(plans.createdAt);

      // Filter client-side: branch-specific + global
      const filtered = result.filter(
        (p) => p.branchId === branchId || p.branchId === null
      );

      logger.debug({ fn: "getPlans", workspaceId, branchId, count: filtered.length, ms: Math.round(performance.now() - start) }, "DAL query complete");
      return filtered;
    }

    const result = await db
      .select()
      .from(plans)
      .where(eq(plans.workspaceId, workspaceId))
      .orderBy(plans.createdAt);

    logger.debug({ fn: "getPlans", workspaceId, count: result.length, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return result;
  } catch (err) {
    logger.error({ err, fn: "getPlans", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Get only active plans for a workspace, optionally filtered by branch. */
export async function getActivePlans(workspaceId: string, branchId?: string | null) {
  const start = performance.now();
  try {
    const result = await db
      .select()
      .from(plans)
      .where(and(eq(plans.workspaceId, workspaceId), eq(plans.active, true)))
      .orderBy(plans.createdAt);

    // If branchId provided, show plans for that branch + workspace-wide plans
    const filtered = branchId
      ? result.filter((p) => p.branchId === branchId || p.branchId === null)
      : result;

    logger.debug({ fn: "getActivePlans", workspaceId, branchId, count: filtered.length, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return filtered;
  } catch (err) {
    logger.error({ err, fn: "getActivePlans", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Get a single plan by ID, scoped to workspace. */
export async function getPlanById(planId: string, workspaceId: string) {
  const start = performance.now();
  try {
    const [plan] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.id, planId), eq(plans.workspaceId, workspaceId)))
      .limit(1);

    logger.debug({ fn: "getPlanById", workspaceId, planId, found: !!plan, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return plan ?? null;
  } catch (err) {
    logger.error({ err, fn: "getPlanById", workspaceId, planId }, "DAL query failed");
    throw err;
  }
}

/** Insert a new plan. */
export async function insertPlan(data: {
  workspaceId: string;
  name: string;
  description?: string | null;
  price: number;
  durationDays: number;
  branchId?: string | null;
}) {
  const start = performance.now();
  try {
    const [plan] = await db.insert(plans).values(data).returning();
    logger.debug({ fn: "insertPlan", workspaceId: data.workspaceId, planId: plan.id, ms: Math.round(performance.now() - start) }, "DAL insert complete");
    return plan;
  } catch (err) {
    logger.error({ err, fn: "insertPlan", workspaceId: data.workspaceId }, "DAL insert failed");
    throw err;
  }
}

/** Update a plan's name, price, duration, and/or branch. */
export async function updatePlan(
  planId: string,
  workspaceId: string,
  data: { name?: string; description?: string | null; price?: number; durationDays?: number; branchId?: string | null }
) {
  const start = performance.now();
  try {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.price !== undefined) updates.price = data.price;
    if (data.durationDays !== undefined) updates.durationDays = data.durationDays;
    if (data.branchId !== undefined) updates.branchId = data.branchId;

    const [updated] = await db
      .update(plans)
      .set(updates)
      .where(and(eq(plans.id, planId), eq(plans.workspaceId, workspaceId)))
      .returning();

    logger.debug({ fn: "updatePlan", workspaceId, planId, ms: Math.round(performance.now() - start) }, "DAL update complete");
    return updated ?? null;
  } catch (err) {
    logger.error({ err, fn: "updatePlan", workspaceId, planId }, "DAL update failed");
    throw err;
  }
}

/** Toggle a plan's active state. */
export async function togglePlanActive(
  planId: string,
  workspaceId: string,
  active: boolean
) {
  const start = performance.now();
  try {
    const [updated] = await db
      .update(plans)
      .set({ active })
      .where(and(eq(plans.id, planId), eq(plans.workspaceId, workspaceId)))
      .returning();

    logger.debug({ fn: "togglePlanActive", workspaceId, planId, active, ms: Math.round(performance.now() - start) }, "DAL update complete");
    return updated ?? null;
  } catch (err) {
    logger.error({ err, fn: "togglePlanActive", workspaceId, planId }, "DAL update failed");
    throw err;
  }
}
