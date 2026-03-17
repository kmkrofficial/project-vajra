"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getGymContext } from "@/lib/gym-context";
import { createBranch, updateBranch } from "@/lib/dal/workspace";
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

  const gym = await getGymContext(session.user.id);
  if (!gym) return { success: false, error: "No gym found." };

  if (gym.role !== "SUPER_ADMIN") {
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
    const branch = await createBranch(gym.gymId, {
      name: data.name.trim(),
      contactPhone: data.contactPhone?.trim() || null,
      latitude: data.latitude?.trim() || null,
      longitude: data.longitude?.trim() || null,
    });

    await insertAuditLog({
      workspaceId: gym.gymId,
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

/**
 * Update a branch's details.
 * **RBAC:** SUPER_ADMIN only.
 *
 * @param branchId - UUID of the branch to update.
 * @param data - Partial branch fields to update.
 * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
 */
export async function updateBranchAction(
  branchId: string,
  data: {
    name?: string;
    contactPhone?: string;
    latitude?: string;
    longitude?: string;
  }
): Promise<ActionResult> {
  if (data.name !== undefined && data.name.trim().length < 2) {
    return { success: false, error: "Branch name must be at least 2 characters." };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const gym = await getGymContext(session.user.id);
  if (!gym) return { success: false, error: "No gym found." };

  if (gym.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only the owner can edit branches." };
  }

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
    const updated = await updateBranch(branchId, gym.gymId, {
      name: data.name?.trim(),
      contactPhone: data.contactPhone?.trim() || null,
      latitude: data.latitude?.trim() || null,
      longitude: data.longitude?.trim() || null,
    });

    if (!updated) {
      return { success: false, error: "Branch not found." };
    }

    await insertAuditLog({
      workspaceId: gym.gymId,
      userId: session.user.id,
      action: "UPDATE_BRANCH",
      entityType: "BRANCH",
      entityId: branchId,
      details: data,
    });

    revalidatePath("/app/branches");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "updateBranchAction", branchId }, "Failed to update branch");
    return { success: false, error: "Failed to update branch." };
  }
}
