import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  gymWorkspaces,
  workspaceUsers,
  branches,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/** Set/update the kiosk PIN for a branch. */
export async function setBranchKioskPin(
  branchId: string,
  workspaceId: string,
  pin: string
): Promise<boolean> {
  const start = performance.now();
  try {
    const [row] = await db
      .update(branches)
      .set({ kioskPin: pin })
      .where(
        and(eq(branches.id, branchId), eq(branches.workspaceId, workspaceId))
      )
      .returning({ id: branches.id });

    logger.debug(
      { fn: "setBranchKioskPin", branchId, ms: Math.round(performance.now() - start) },
      "DAL update complete"
    );
    return !!row;
  } catch (err) {
    logger.error({ err, fn: "setBranchKioskPin", branchId }, "DAL update failed");
    throw err;
  }
}

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
        upiQrImageUrl: gymWorkspaces.upiQrImageUrl,
        whatsappTemplate: gymWorkspaces.whatsappTemplate,
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

/** Create a new branch within a workspace. */
export async function createBranch(
  workspaceId: string,
  data: {
    name: string;
    contactPhone?: string | null;
    latitude?: string | null;
    longitude?: string | null;
  }
) {
  const start = performance.now();
  try {
    const [branch] = await db
      .insert(branches)
      .values({
        workspaceId,
        name: data.name,
        contactPhone: data.contactPhone ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      })
      .returning();

    logger.debug(
      { fn: "createBranch", workspaceId, branchId: branch.id, ms: Math.round(performance.now() - start) },
      "DAL insert complete"
    );
    return branch;
  } catch (err) {
    logger.error({ err, fn: "createBranch", workspaceId }, "DAL insert failed");
    throw err;
  }
}

/** Update a branch's details (name, phone, coordinates). */
export async function updateBranch(
  branchId: string,
  workspaceId: string,
  data: {
    name?: string;
    contactPhone?: string | null;
    latitude?: string | null;
    longitude?: string | null;
  }
) {
  const start = performance.now();
  try {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.contactPhone !== undefined) updates.contactPhone = data.contactPhone;
    if (data.latitude !== undefined) updates.latitude = data.latitude;
    if (data.longitude !== undefined) updates.longitude = data.longitude;

    const [updated] = await db
      .update(branches)
      .set(updates)
      .where(and(eq(branches.id, branchId), eq(branches.workspaceId, workspaceId)))
      .returning();

    logger.debug(
      { fn: "updateBranch", workspaceId, branchId, ms: Math.round(performance.now() - start) },
      "DAL update complete"
    );
    return updated ?? null;
  } catch (err) {
    logger.error({ err, fn: "updateBranch", workspaceId, branchId }, "DAL update failed");
    throw err;
  }
}

/** Update workspace-level settings (UPI handle, QR image, WhatsApp template, etc.). */
export async function updateWorkspaceSettings(
  workspaceId: string,
  data: {
    ownerUpiId?: string | null;
    upiQrImageUrl?: string | null;
    whatsappTemplate?: string | null;
  }
) {
  const start = performance.now();
  try {
    const [updated] = await db
      .update(gymWorkspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gymWorkspaces.id, workspaceId))
      .returning({ id: gymWorkspaces.id });

    logger.debug(
      { fn: "updateWorkspaceSettings", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL update complete"
    );
    return !!updated;
  } catch (err) {
    logger.error({ err, fn: "updateWorkspaceSettings", workspaceId }, "DAL update failed");
    throw err;
  }
}

/** Get all branches for a workspace with coordinates. */
export async function getBranches(workspaceId: string) {
  const start = performance.now();
  try {
    const result = await db
      .select({
        id: branches.id,
        name: branches.name,
        contactPhone: branches.contactPhone,
        latitude: branches.latitude,
        longitude: branches.longitude,
        createdAt: branches.createdAt,
      })
      .from(branches)
      .where(eq(branches.workspaceId, workspaceId))
      .orderBy(branches.createdAt);

    logger.debug(
      { fn: "getBranches", workspaceId, count: result.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return result;
  } catch (err) {
    logger.error({ err, fn: "getBranches", workspaceId }, "DAL query failed");
    throw err;
  }
}
