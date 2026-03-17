import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { workspaceUsers, gymWorkspaces, branches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const BRANCH_COOKIE = "vajra_active_branch";

export type GymRole = "SUPER_ADMIN" | "MANAGER" | "RECEPTIONIST" | "TRAINER";

export interface GymContext {
  gymId: string;
  role: GymRole;
  branchId: string | null;
  assignedBranchId: string | null;
}

/**
 * Look up the authenticated user's gym from the DB and read the active
 * branch from a lightweight cookie.
 *
 * Returns null if the user has no gym membership (needs onboarding).
 */
export async function getGymContext(
  userId: string
): Promise<GymContext | null> {
  const [row] = await db
    .select({
      gymId: workspaceUsers.workspaceId,
      role: workspaceUsers.role,
      assignedBranchId: workspaceUsers.assignedBranchId,
    })
    .from(workspaceUsers)
    .where(eq(workspaceUsers.userId, userId))
    .limit(1);

  if (!row) return null;

  const cookieStore = await cookies();
  const branchId = cookieStore.get(BRANCH_COOKIE)?.value || null;

  return {
    gymId: row.gymId,
    role: row.role as GymRole,
    branchId,
    assignedBranchId: row.assignedBranchId,
  };
}

/**
 * Get detailed gym info (name, UPI, branches) for the user's gym.
 * Returns null if user is not a member of the gym.
 */
export async function getGymDetails(gymId: string, userId: string) {
  const [membership] = await db
    .select({
      gymId: gymWorkspaces.id,
      name: gymWorkspaces.name,
      primaryBranchName: gymWorkspaces.primaryBranchName,
      ownerUpiId: gymWorkspaces.ownerUpiId,
      upiQrImageUrl: gymWorkspaces.upiQrImageUrl,
      whatsappTemplate: gymWorkspaces.whatsappTemplate,
      role: workspaceUsers.role,
      assignedBranchId: workspaceUsers.assignedBranchId,
    })
    .from(workspaceUsers)
    .innerJoin(
      gymWorkspaces,
      eq(workspaceUsers.workspaceId, gymWorkspaces.id)
    )
    .where(
      and(
        eq(workspaceUsers.workspaceId, gymId),
        eq(workspaceUsers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) return null;

  const gymBranches = await db
    .select({
      id: branches.id,
      name: branches.name,
      contactPhone: branches.contactPhone,
    })
    .from(branches)
    .where(eq(branches.workspaceId, gymId));

  return {
    ...membership,
    branches: gymBranches,
  };
}
