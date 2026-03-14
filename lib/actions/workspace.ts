"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { getBranches } from "@/lib/dal/workspace";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

const WORKSPACE_COOKIE = "vajra_active_workspace";

type ActionResult = { success: boolean; error?: string };

/**
 * Switch the active workspace for the current user.
 * Verifies membership before updating the cookie.
 */
export async function switchWorkspaceAction(
  newWorkspaceId: string
): Promise<ActionResult> {
  if (!newWorkspaceId) {
    return { success: false, error: "Workspace ID is required." };
  }

  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Not authenticated." };
  }

  // Verify the user actually belongs to this workspace
  const membership = await verifyWorkspaceMembership(
    newWorkspaceId,
    session.user.id
  );
  if (!membership) {
    logger.warn(
      { userId: session.user.id, targetWorkspace: newWorkspaceId },
      "Workspace switch denied — user is not a member"
    );
    return { success: false, error: "You do not belong to this workspace." };
  }

  // Get the first branch for the workspace context
  const branchList = await getBranches(newWorkspaceId);
  const primaryBranchId = membership.assignedBranchId ?? branchList[0]?.id ?? null;

  try {
    // Set the secure workspace cookie
    const cookieStore = await cookies();
    const value = JSON.stringify({
      workspaceId: newWorkspaceId,
      branchId: primaryBranchId,
      role: membership.role,
    });

    cookieStore.set(WORKSPACE_COOKIE, value, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
      httpOnly: false, // Client provider reads this
    });

    // Audit log the switch
    await insertAuditLog({
      workspaceId: newWorkspaceId,
      userId: session.user.id,
      action: "WORKSPACE_SWITCHED",
      entityType: "WORKSPACE",
      entityId: newWorkspaceId,
    });

    // Purge router cache — force re-render with new workspace data
    revalidatePath("/", "layout");

    logger.info(
      { userId: session.user.id, newWorkspaceId, role: membership.role },
      "Workspace switched"
    );
    return { success: true };
  } catch (err) {
    logger.error(
      { err, userId: session.user.id, newWorkspaceId },
      "Failed to switch workspace"
    );
    return { success: false, error: "Failed to switch workspace." };
  }
}
