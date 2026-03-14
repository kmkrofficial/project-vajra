"use server";

import { getMemberByPin } from "@/lib/dal/members";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getSession } from "@/lib/actions/auth";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";
import { setupKioskPin, verifyKioskPin } from "@/lib/actions/settings";

type KioskResult =
  | { success: true; memberName: string }
  | { success: false; error: string };

type ActionResult = { success: boolean; error?: string };

/**
 * Set the kiosk exit PIN for a branch.
 * Delegates to setupKioskPin which stores a hashed PIN.
 * Only SUPER_ADMIN and MANAGER roles can set this.
 */
export async function setKioskPin(
  _branchId: string,
  pin: string
): Promise<ActionResult> {
  return setupKioskPin(pin);
}

/**
 * Verify the kiosk exit PIN for a branch.
 * Delegates to verifyKioskPin which compares against hashed PIN.
 */
export async function verifyKioskExitPin(
  _branchId: string,
  pin: string
): Promise<ActionResult> {
  return verifyKioskPin(pin);
}

/**
 * Process a kiosk check-in by PIN.
 * Looks up the member in the given branch; returns success only if ACTIVE.
 */
export async function processKioskCheckin(
  pin: string,
  branchId: string
): Promise<KioskResult> {
  if (!pin || pin.length !== 4) {
    return { success: false, error: "Invalid PIN format" };
  }

  if (!branchId) {
    return { success: false, error: "No branch configured" };
  }

  try {
    const member = await getMemberByPin(pin, branchId);

    if (!member) {
      return { success: false, error: "Expired or Invalid PIN" };
    }

    if (member.status !== "ACTIVE") {
      return { success: false, error: "Expired or Invalid PIN" };
    }

    // Member is active — check-in is valid
    await insertAuditLog({
      workspaceId: member.workspaceId,
      userId: null,
      action: "KIOSK_CHECKIN",
      entityType: "MEMBER",
      entityId: member.id,
      details: { branchId },
    });
    return { success: true, memberName: member.name };
  } catch (err) {
    logger.error({ err, action: "kiosk_checkin", branchId }, "Kiosk check-in failed");
    return { success: false, error: "Check-in failed. Please try again." };
  }
}
