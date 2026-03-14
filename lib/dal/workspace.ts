import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  gymWorkspaces,
  workspaceUsers,
  branches,
} from "@/lib/db/schema";

/** Returns all workspaces the given user belongs to, with their role. */
export async function getUserWorkspaces(userId: string) {
  const results = await db
    .select({
      id: gymWorkspaces.id,
      name: gymWorkspaces.name,
      primaryBranchName: gymWorkspaces.primaryBranchName,
      role: workspaceUsers.role,
      createdAt: gymWorkspaces.createdAt,
    })
    .from(workspaceUsers)
    .innerJoin(gymWorkspaces, eq(workspaceUsers.workspaceId, gymWorkspaces.id))
    .where(eq(workspaceUsers.userId, userId));

  return results;
}

/**
 * Returns full workspace details ONLY if the user is authorized.
 * Returns `null` if the user does not belong to the workspace.
 */
export async function getWorkspaceDetails(
  workspaceId: string,
  userId: string
) {
  const [membership] = await db
    .select({
      workspaceId: gymWorkspaces.id,
      name: gymWorkspaces.name,
      primaryBranchName: gymWorkspaces.primaryBranchName,
      ownerUpiId: gymWorkspaces.ownerUpiId,
      role: workspaceUsers.role,
      assignedBranchId: workspaceUsers.assignedBranchId,
    })
    .from(workspaceUsers)
    .innerJoin(gymWorkspaces, eq(workspaceUsers.workspaceId, gymWorkspaces.id))
    .where(
      and(
        eq(workspaceUsers.workspaceId, workspaceId),
        eq(workspaceUsers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) return null;

  const workspaceBranches = await db
    .select({
      id: branches.id,
      name: branches.name,
      contactPhone: branches.contactPhone,
    })
    .from(branches)
    .where(eq(branches.workspaceId, workspaceId));

  return {
    ...membership,
    branches: workspaceBranches,
  };
}

/**
 * Verify a user has membership in a workspace.
 * Lightweight check — no joins, just returns the role or null.
 */
export async function verifyWorkspaceMembership(
  workspaceId: string,
  userId: string
) {
  const [row] = await db
    .select({
      role: workspaceUsers.role,
      assignedBranchId: workspaceUsers.assignedBranchId,
    })
    .from(workspaceUsers)
    .where(
      and(
        eq(workspaceUsers.workspaceId, workspaceId),
        eq(workspaceUsers.userId, userId)
      )
    )
    .limit(1);

  return row ?? null;
}
