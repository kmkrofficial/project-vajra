import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";

/** Get all plans for a workspace. */
export async function getPlans(workspaceId: string) {
  return db
    .select()
    .from(plans)
    .where(eq(plans.workspaceId, workspaceId))
    .orderBy(plans.createdAt);
}

/** Get only active plans for a workspace. */
export async function getActivePlans(workspaceId: string) {
  return db
    .select()
    .from(plans)
    .where(and(eq(plans.workspaceId, workspaceId), eq(plans.active, true)))
    .orderBy(plans.createdAt);
}

/** Get a single plan by ID, scoped to workspace. */
export async function getPlanById(planId: string, workspaceId: string) {
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.workspaceId, workspaceId)))
    .limit(1);

  return plan ?? null;
}

/** Insert a new plan. */
export async function insertPlan(data: {
  workspaceId: string;
  name: string;
  price: number;
  durationDays: number;
}) {
  const [plan] = await db.insert(plans).values(data).returning();
  return plan;
}

/** Toggle a plan's active state. */
export async function togglePlanActive(
  planId: string,
  workspaceId: string,
  active: boolean
) {
  const [updated] = await db
    .update(plans)
    .set({ active })
    .where(and(eq(plans.id, planId), eq(plans.workspaceId, workspaceId)))
    .returning();

  return updated ?? null;
}
