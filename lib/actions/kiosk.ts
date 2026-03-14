"use server";

import { getMemberByPin } from "@/lib/dal/members";

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

  const member = await getMemberByPin(pin, branchId);

  if (!member) {
    return { success: false, error: "Expired or Invalid PIN" };
  }

  if (member.status !== "ACTIVE") {
    return { success: false, error: "Expired or Invalid PIN" };
  }

  // Member is active — check-in is valid
  return { success: true, memberName: member.name };
}
