"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { insertPlan, togglePlanActive, getPlans } from "@/lib/dal/plans";

type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};

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
    await insertPlan({
      workspaceId: ws.workspaceId,
      name: data.name,
      price: data.price,
      durationDays: data.durationDays,
    });

    revalidatePath("/app/settings/plans");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create plan." };
  }
}

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
    revalidatePath("/app/settings/plans");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update plan." };
  }
}

export async function fetchPlans() {
  const session = await getSession();
  if (!session?.user) return [];

  const ws = await getActiveWorkspace();
  if (!ws) return [];

  return getPlans(ws.workspaceId);
}
