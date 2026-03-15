"use server";

import { getMemberByPin } from "@/lib/dal/members";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getSession } from "@/lib/actions/auth";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { insertAuditLog } from "@/lib/dal/audit";
import { findOpenSession, checkIn, checkOut } from "@/lib/dal/attendance";
import { logger } from "@/lib/logger";

type KioskResult =
  | { success: true; memberName: string; action: "checkin" | "checkout" }
  | { success: false; error: string };

/**
 * Process a kiosk PIN entry.
 * If `checkoutEnabled` is true and the member has an open session → check them out.
 * Otherwise → always check in (creates a new attendance row each time).
 */
export async function processKioskCheckin(
  pin: string,
  branchId: string,
  checkoutEnabled: boolean = false
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

    if (member.status !== "ACTIVE" && member.status !== "TRIAL") {
      return { success: false, error: "Expired or Invalid PIN" };
    }

    // Check for an existing open session (check-in without check-out)
    if (checkoutEnabled) {
      const openSession = await findOpenSession(member.id, branchId);

      if (openSession) {
        // Close the session — this is a check-out
        await checkOut(openSession.id);

        await insertAuditLog({
          workspaceId: member.workspaceId,
          userId: null,
          action: "KIOSK_CHECKOUT",
          entityType: "MEMBER",
          entityId: member.id,
          details: { branchId, attendanceId: openSession.id },
        });

        return { success: true, memberName: member.name, action: "checkout" };
      }
    }

    // No open session — check in
    const attendanceId = await checkIn(member.workspaceId, branchId, member.id);

    await insertAuditLog({
      workspaceId: member.workspaceId,
      userId: null,
      action: "KIOSK_CHECKIN",
      entityType: "MEMBER",
      entityId: member.id,
      details: { branchId, attendanceId },
    });

    return { success: true, memberName: member.name, action: "checkin" };
  } catch (err) {
    logger.error({ err, action: "kiosk_checkin", branchId }, "Kiosk PIN processing failed");
    return { success: false, error: "Check-in failed. Please try again." };
  }
}
