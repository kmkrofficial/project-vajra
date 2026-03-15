"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { getBranches } from "@/lib/dal/workspace";
import { getEmployeeByUserId, getEmployeeBranches } from "@/lib/dal/employees";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";
import cfg from "@/lib/config";

const WORKSPACE_COOKIE = "vajra_active_workspace";

type ActionResult = { success: boolean; error?: string };
type SwitchResult = { success: true; branchId: string | null; role: string } | { success: false; error: string };

/**
 * Switch the active workspace for the current user.
 * Verifies membership before updating the cookie.
 * If the user already has a cookie for this workspace, reuses the stored branchId
 * so they return to their last-used branch.
 */
export async function switchWorkspaceAction(
  newWorkspaceId: string
): Promise<SwitchResult> {
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

  // Resolve which branch to land on:
  // 1) If user already had a cookie for THIS workspace, reuse their last branch
  // 2) Otherwise fall back to assigned branch or first branch
  const branchList = await getBranches(newWorkspaceId);
  const cookieStore = await cookies();
  const existingRaw = cookieStore.get(WORKSPACE_COOKIE)?.value;
  let primaryBranchId: string | null = null;

  if (existingRaw) {
    try {
      const prev = JSON.parse(decodeURIComponent(existingRaw));
      if (prev.workspaceId === newWorkspaceId && prev.branchId) {
        // Verify the remembered branch still exists
        const stillExists = branchList.some((b) => b.id === prev.branchId);
        if (stillExists) primaryBranchId = prev.branchId;
      }
    } catch { /* ignore malformed cookie */ }
  }

  if (!primaryBranchId) {
    primaryBranchId = membership.assignedBranchId ?? branchList[0]?.id ?? null;
  }

  try {
    const value = JSON.stringify({
      workspaceId: newWorkspaceId,
      branchId: primaryBranchId,
      role: membership.role,
    });

    cookieStore.set(WORKSPACE_COOKIE, value, {
      path: "/",
      maxAge: cfg.auth.workspaceCookieMaxAge, // from config.yml
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
      { userId: session.user.id, newWorkspaceId, role: membership.role, branchId: primaryBranchId },
      "Workspace switched"
    );
    return { success: true, branchId: primaryBranchId, role: membership.role };
  } catch (err) {
    logger.error(
      { err, userId: session.user.id, newWorkspaceId },
      "Failed to switch workspace"
    );
    return { success: false, error: "Failed to switch workspace." };
  }
}

/**
 * Switch the active branch within the current workspace.
 * Admins (SUPER_ADMIN / MANAGER) can pick any branch or "all" (null).
 * Staff can only switch to branches they are assigned to.
 */
export async function switchBranchAction(
  branchId: string | null
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const cookieStore = await cookies();
  const raw = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (!raw) return { success: false, error: "No active workspace." };

  let parsed: { workspaceId: string; branchId: string | null; role: string };
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return { success: false, error: "Invalid workspace cookie." };
  }

  const { workspaceId, role } = parsed;
  const isAdmin = ["SUPER_ADMIN", "MANAGER"].includes(role);

  // "All branches" (null) is only for admins
  if (branchId === null && !isAdmin) {
    return { success: false, error: "Only owners and managers can view all branches." };
  }

  // If non-admin, verify they have access to this branch
  if (!isAdmin && branchId) {
    const employee = await getEmployeeByUserId(workspaceId, session.user.id);
    if (employee) {
      const assignedBranches = await getEmployeeBranches(employee.id, workspaceId);
      const hasAccess = assignedBranches.some((b) => b.id === branchId);
      if (!hasAccess) {
        return { success: false, error: "You do not have access to this branch." };
      }
    }
  }

  // If branchId provided, verify it exists in the workspace
  if (branchId) {
    const allBranches = await getBranches(workspaceId);
    if (!allBranches.some((b) => b.id === branchId)) {
      return { success: false, error: "Branch not found." };
    }
  }

  try {
    const value = JSON.stringify({
      workspaceId,
      branchId,
      role,
    });

    cookieStore.set(WORKSPACE_COOKIE, value, {
      path: "/",
      maxAge: cfg.auth.workspaceCookieMaxAge,
      sameSite: "lax",
      httpOnly: false,
    });

    revalidatePath("/", "layout");

    logger.info(
      { userId: session.user.id, workspaceId, branchId, role },
      "Branch switched"
    );
    return { success: true };
  } catch (err) {
    logger.error(
      { err, userId: session.user.id, workspaceId, branchId },
      "Failed to switch branch"
    );
    return { success: false, error: "Failed to switch branch." };
  }
}
