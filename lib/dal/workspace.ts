import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  gymWorkspaces,
  workspaceUsers,
  branches,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/** Returns all workspaces the given user belongs to, with their role. */
export async function getUserWorkspaces(userId: string) {
  const start = performance.now();
  try {
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

    logger.debug({ fn: "getUserWorkspaces", userId, count: results.length, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return results;
  } catch (err) {
    logger.error({ err, fn: "getUserWorkspaces", userId }, "DAL query failed");
    throw err;
  }
}

/**
 * Returns full workspace details ONLY if the user is authorized.
 * Returns `null` if the user does not belong to the workspace.
 */
export async function getWorkspaceDetails(
  workspaceId: string,
  userId: string
) {
  const start = performance.now();
  try {
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

    logger.debug({ fn: "getWorkspaceDetails", workspaceId, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return {
      ...membership,
      branches: workspaceBranches,
    };
  } catch (err) {
    logger.error({ err, fn: "getWorkspaceDetails", workspaceId }, "DAL query failed");
    throw err;
  }
}

/**
 * Verify a user has membership in a workspace.
 * Lightweight check — no joins, just returns the role or null.
 */
export async function verifyWorkspaceMembership(
  workspaceId: string,
  userId: string
) {
  const start = performance.now();
  try {
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

    logger.debug({ fn: "verifyWorkspaceMembership", workspaceId, found: !!row, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return row ?? null;
  } catch (err) {
    logger.error({ err, fn: "verifyWorkspaceMembership", workspaceId }, "DAL query failed");
    throw err;
  }
}
