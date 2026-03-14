"use server";

import { getMemberByPin } from "@/lib/dal/members";
import { logger } from "@/lib/logger";

type KioskResult =
  | { success: true; memberName: string }
  | { success: false; error: string };

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
    logger.info(
      { action: "kiosk_checkin", branchId, memberId: member.id },
      "Kiosk check-in successful"
    );
    return { success: true, memberName: member.name };
  } catch (err) {
    logger.error({ err, action: "kiosk_checkin", branchId }, "Kiosk check-in failed");
    return { success: false, error: "Check-in failed. Please try again." };
  }
}
