"use server";

import { getMemberByPin } from "@/lib/dal/members";
import { getBranchKioskPin, setBranchKioskPin } from "@/lib/dal/workspace";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getSession } from "@/lib/actions/auth";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

type KioskResult =
  | { success: true; memberName: string }
  | { success: false; error: string };

type ActionResult = { success: boolean; error?: string };

/**
 * Set the kiosk exit PIN for a branch.
 * Only SUPER_ADMIN and MANAGER roles can set this.
 */
export async function setKioskPin(
  branchId: string,
  pin: string
): Promise<ActionResult> {
  if (!pin || pin.length < 4 || pin.length > 6) {
    return { success: false, error: "PIN must be 4-6 digits." };
  }

  if (!/^\d+$/.test(pin)) {
    return { success: false, error: "PIN must contain only digits." };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || !["SUPER_ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Only admins can set the kiosk PIN." };
  }

  try {
    await setBranchKioskPin(branchId, ws.workspaceId, pin);

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "SET_KIOSK_PIN",
      entityType: "BRANCH",
      entityId: branchId,
      details: { note: "Kiosk exit PIN updated" },
    });

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "set_kiosk_pin", branchId }, "Failed to set kiosk PIN");
    return { success: false, error: "Failed to save PIN." };
  }
}

/**
 * Verify the kiosk exit PIN for a branch.
 */
export async function verifyKioskExitPin(
  branchId: string,
  pin: string
): Promise<ActionResult> {
  if (!pin || !branchId) {
    return { success: false, error: "Missing PIN or branch." };
  }

  try {
    const ws = await getActiveWorkspace();
    if (!ws) return { success: false, error: "No active workspace." };

    const storedPin = await getBranchKioskPin(branchId, ws.workspaceId);

    if (!storedPin) {
      return { success: false, error: "Kiosk PIN not configured." };
    }

    if (storedPin !== pin) {
      return { success: false, error: "Incorrect PIN." };
    }

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "verify_kiosk_exit_pin", branchId }, "Kiosk exit verification failed");
    return { success: false, error: "Verification failed." };
  }
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
