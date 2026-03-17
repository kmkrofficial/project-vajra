"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getGymContext } from "@/lib/gym-context";
import { getBranches } from "@/lib/dal/workspace";
import { getEmployeeByUserId, getEmployeeBranches } from "@/lib/dal/employees";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

const BRANCH_COOKIE = "vajra_active_branch";

type ActionResult = { success: boolean; error?: string };

/**
 * Switch the active branch within the user's gym.
 * Admins (SUPER_ADMIN / MANAGER) can pick any branch or "all" (null).
 * Staff can only switch to branches they are assigned to.
 */
export async function switchBranchAction(
  branchId: string | null
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const gym = await getGymContext(session.user.id);
  if (!gym) return { success: false, error: "No gym found." };

  const isAdmin = ["SUPER_ADMIN", "MANAGER"].includes(gym.role);

  // "All branches" (null) is only for admins
  if (branchId === null && !isAdmin) {
    return { success: false, error: "Only owners and managers can view all branches." };
  }

  // If non-admin, verify they have access to this branch
  if (!isAdmin && branchId) {
    const employee = await getEmployeeByUserId(gym.gymId, session.user.id);
    if (employee) {
      const assignedBranches = await getEmployeeBranches(employee.id, gym.gymId);
      const hasAccess = assignedBranches.some((b) => b.id === branchId);
      if (!hasAccess) {
        return { success: false, error: "You do not have access to this branch." };
      }
    }
  }

  // If branchId provided, verify it exists in the gym
  if (branchId) {
    const allBranches = await getBranches(gym.gymId);
    if (!allBranches.some((b) => b.id === branchId)) {
      return { success: false, error: "Branch not found." };
    }
  }

  try {
    const cookieStore = await cookies();
    if (branchId) {
      cookieStore.set(BRANCH_COOKIE, branchId, {
        path: "/",
        maxAge: 2592000, // 30 days
        sameSite: "lax",
        httpOnly: false,
      });
    } else {
      // "All branches" — clear the cookie
      cookieStore.set(BRANCH_COOKIE, "", {
        path: "/",
        maxAge: 0,
      });
    }

    revalidatePath("/", "layout");

    logger.info(
      { userId: session.user.id, gymId: gym.gymId, branchId, role: gym.role },
      "Branch switched"
    );
    return { success: true };
  } catch (err) {
    logger.error(
      { err, userId: session.user.id, gymId: gym.gymId, branchId },
      "Failed to switch branch"
    );
    return { success: false, error: "Failed to switch branch." };
  }
}
