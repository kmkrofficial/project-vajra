"use server";

import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { upsertWorkspaceConfig } from "@/lib/dal/config";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

type ActionResult = { success: boolean; error?: string };

// ─── Server Actions ─────────────────────────────────────────────────────────

/**
 * Toggle the member checkout feature on/off for the active branch.
 * When disabled (default), the kiosk only records check-ins.
 * When enabled, a second PIN entry closes the open session (check-out).
 * Only SUPER_ADMIN and MANAGER roles can toggle this.
 */
export async function toggleCheckoutEnabled(
  enabled: boolean
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(
    ws.workspaceId,
    session.user.id
  );
  if (!membership || !["SUPER_ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Only admins can change this setting." };
  }

  try {
    await upsertWorkspaceConfig(ws.workspaceId, ws.branchId ?? null, {
      checkoutEnabled: enabled,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "TOGGLE_CHECKOUT",
      entityType: "CONFIGURATION",
      entityId: ws.branchId ?? ws.workspaceId,
      details: { checkoutEnabled: enabled },
    });

    return { success: true };
  } catch (err) {
    logger.error(
      { err, action: "toggleCheckoutEnabled" },
      "Failed to toggle checkout"
    );
    return { success: false, error: "Failed to save setting." };
  }
}
