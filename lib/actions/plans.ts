"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { insertPlan, togglePlanActive, updatePlan, getPlans } from "@/lib/dal/plans";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Create a new subscription plan.
 * **RBAC:** SUPER_ADMIN or MANAGER only.
 *
 * @param data - Plan details: `name`, `price` (INR), `durationDays`.
 * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
 */
export async function createPlan(data: {
  name: string;
  price: number;
  durationDays: number;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  // Verify RBAC — only SUPER_ADMIN and MANAGER can manage plans
  const membership = await verifyWorkspaceMembership(
    ws.workspaceId,
    session.user.id
  );
  if (!membership || !["SUPER_ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Insufficient permissions." };
  }

  try {
    const plan = await insertPlan({
      workspaceId: ws.workspaceId,
      name: data.name,
      price: data.price,
      durationDays: data.durationDays,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "CREATE_PLAN",
      entityType: "PLAN",
      entityId: plan.id,
      details: { name: data.name, price: data.price, durationDays: data.durationDays },
    });

    revalidatePath("/app/settings/plans");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "create_plan", workspaceId: ws.workspaceId, userId: session.user.id }, "Failed to create plan");
    return { success: false, error: "Failed to create plan." };
  }
}

/**
 * Update an existing plan's name, price, and/or duration.
 * **RBAC:** SUPER_ADMIN or MANAGER only.
 *
 * @param planId - UUID of the plan to update.
 * @param data - Partial plan details to update.
 * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
 */
export async function updatePlanAction(
  planId: string,
  data: { name?: string; price?: number; durationDays?: number }
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(
    ws.workspaceId,
    session.user.id
  );
  if (!membership || !["SUPER_ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Insufficient permissions." };
  }

  if (data.name !== undefined && data.name.trim().length < 2) {
    return { success: false, error: "Plan name must be at least 2 characters." };
  }
  if (data.price !== undefined && data.price < 1) {
    return { success: false, error: "Price must be at least ₹1." };
  }
  if (data.durationDays !== undefined && data.durationDays < 1) {
    return { success: false, error: "Duration must be at least 1 day." };
  }

  try {
    const updated = await updatePlan(planId, ws.workspaceId, {
      name: data.name?.trim(),
      price: data.price,
      durationDays: data.durationDays,
    });

    if (!updated) {
      return { success: false, error: "Plan not found." };
    }

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "UPDATE_PLAN",
      entityType: "PLAN",
      entityId: planId,
      details: data,
    });

    revalidatePath("/app/settings/plans");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "update_plan", workspaceId: ws.workspaceId, userId: session.user.id, planId }, "Failed to update plan");
    return { success: false, error: "Failed to update plan." };
  }
}

/**
 * Enable or disable an existing plan.
 * **RBAC:** SUPER_ADMIN or MANAGER only.
 *
 * @param planId - UUID of the plan to toggle.
 * @param active - `true` to enable, `false` to disable.
 * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
 */
export async function togglePlan(
  planId: string,
  active: boolean
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(
    ws.workspaceId,
    session.user.id
  );
  if (!membership || !["SUPER_ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Insufficient permissions." };
  }

  try {
    await togglePlanActive(planId, ws.workspaceId, active);

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "TOGGLE_PLAN",
      entityType: "PLAN",
      entityId: planId,
      details: { active },
    });

    revalidatePath("/app/settings/plans");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "toggle_plan", workspaceId: ws.workspaceId, userId: session.user.id, planId }, "Failed to toggle plan");
    return { success: false, error: "Failed to update plan." };
  }
}

/**
 * Fetch all plans (active and inactive) for the current workspace.
 * @returns Array of plan records, or an empty array if unauthenticated / no workspace.
 */
export async function fetchPlans() {
  const session = await getSession();
  if (!session?.user) return [];

  const ws = await getActiveWorkspace();
  if (!ws) return [];

  return getPlans(ws.workspaceId);
}
