"use server";

import { getMemberByPin } from "@/lib/dal/members";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getSession } from "@/lib/actions/auth";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { insertAuditLog } from "@/lib/dal/audit";
import { findOpenSession, checkIn, checkOut } from "@/lib/dal/attendance";
import { logger } from "@/lib/logger";
import cfg from "@/lib/config";

type KioskResult =
  | { success: true; memberName: string; action: "checkin" | "checkout"; expiryWarning?: string }
  | { success: false; error: string; memberName?: string };

/**
 * Process a kiosk PIN entry.
 * If `checkoutEnabled` is true and the member has an open session → check them out.
 * Otherwise → always check in (creates a new attendance row each time).
 *
 * Returns friendly, personalised messages for every status scenario:
 *  • PIN not found → guidance to talk to receptionist
 *  • EXPIRED / PENDING_PAYMENT / ENQUIRY / CHURNED → named message, denied entry
 *  • ACTIVE with ≤ 3 days until expiry → check in + warning
 *  • ACTIVE / TRIAL → normal check in/out
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
      return {
        success: false,
        error: "Sorry, we couldn't identify your PIN. If you're a new member, please talk to the receptionist for assistance.",
      };
    }

    // ── Status-specific denial messages ──────────────────────────────
    if (member.status === "EXPIRED") {
      return {
        success: false,
        memberName: member.name,
        error: `Hi ${member.name}, your membership has expired. Please talk to the receptionist to renew your plan.`,
      };
    }

    if (member.status === "PENDING_PAYMENT") {
      return {
        success: false,
        memberName: member.name,
        error: `Hi ${member.name}, to continue at our gym please complete your payment. Talk to the receptionist for more info.`,
      };
    }

    if (member.status === "ENQUIRY") {
      return {
        success: false,
        memberName: member.name,
        error: `Hi ${member.name}, to start your gym journey please sign up for a plan. Talk to the receptionist for details.`,
      };
    }

    if (member.status === "CHURNED") {
      return {
        success: false,
        memberName: member.name,
        error: `Hi ${member.name}, we'd love to have you back! Please talk to the receptionist to rejoin.`,
      };
    }

    // ── ACTIVE / TRIAL — allowed to enter ────────────────────────────

    // Build an expiry warning if the plan ends soon
    let expiryWarning: string | undefined;
    if (member.status === "ACTIVE" && member.expiryDate) {
      const now = new Date();
      const msLeft = member.expiryDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      if (daysLeft <= cfg.kiosk.expiryWarningDays && daysLeft > 0) {
        expiryWarning = `Your plan ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Talk to the receptionist to renew.`;
      }
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

    return { success: true, memberName: member.name, action: "checkin", expiryWarning };
  } catch (err) {
    logger.error({ err, action: "kiosk_checkin", branchId }, "Kiosk PIN processing failed");
    return { success: false, error: "Check-in failed. Please try again." };
  }
}
