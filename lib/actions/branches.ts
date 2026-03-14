"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership, createBranch } from "@/lib/dal/workspace";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

type ActionResult = { success: boolean; error?: string };

/** Create a new branch. Only SUPER_ADMIN can create branches. */
export async function createBranchAction(data: {
  name: string;
  contactPhone?: string;
  latitude?: string;
  longitude?: string;
}): Promise<ActionResult> {
  if (!data.name || data.name.trim().length < 2) {
    return { success: false, error: "Branch name must be at least 2 characters." };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || membership.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only the owner can create branches." };
  }

  // Validate coordinates if provided
  if (data.latitude || data.longitude) {
    const lat = parseFloat(data.latitude ?? "");
    const lng = parseFloat(data.longitude ?? "");
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return { success: false, error: "Invalid latitude. Must be between -90 and 90." };
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return { success: false, error: "Invalid longitude. Must be between -180 and 180." };
    }
  }

  try {
    const branch = await createBranch(ws.workspaceId, {
      name: data.name.trim(),
      contactPhone: data.contactPhone?.trim() || null,
      latitude: data.latitude?.trim() || null,
      longitude: data.longitude?.trim() || null,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "CREATE_BRANCH",
      entityType: "BRANCH",
      entityId: branch.id,
      details: { name: data.name },
    });

    revalidatePath("/app/branches");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "createBranchAction" }, "Failed to create branch");
    return { success: false, error: "Failed to create branch." };
  }
}
