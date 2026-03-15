"use server";

import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { updateWorkspaceSettings } from "@/lib/dal/workspace";
import { upsertWorkspaceConfig } from "@/lib/dal/config";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";
import cfg from "@/lib/config";

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

/**
 * Update the workspace UPI handle (e.g. yourname@paytm).
 * Only SUPER_ADMIN and MANAGER roles can change this.
 */
export async function updateUpiHandle(
  upiId: string
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

  const trimmed = upiId.trim();
  if (!trimmed) {
    return { success: false, error: "UPI ID cannot be empty." };
  }
  // Basic UPI ID format: something@something
  if (!trimmed.includes("@")) {
    return { success: false, error: "Invalid UPI ID format (e.g. name@bank)." };
  }

  try {
    await updateWorkspaceSettings(ws.workspaceId, {
      ownerUpiId: trimmed,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "UPDATE_UPI_HANDLE",
      entityType: "WORKSPACE",
      entityId: ws.workspaceId,
      details: { upiId: trimmed },
    });

    return { success: true };
  } catch (err) {
    logger.error(
      { err, action: "updateUpiHandle" },
      "Failed to update UPI handle"
    );
    return { success: false, error: "Failed to save UPI handle." };
  }
}

/**
 * Save or remove a custom UPI QR code image (base64 data URL).
 * Only SUPER_ADMIN and MANAGER roles can change this.
 * Pass `null` to remove the uploaded QR (reverts to auto-generated).
 */
export async function updateUpiQrImage(
  imageDataUrl: string | null
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

  // Validate base64 data URL (must be an image, max ~500 KB)
  if (imageDataUrl) {
    if (!imageDataUrl.startsWith("data:image/")) {
      return { success: false, error: "Invalid image format." };
    }
    // ~500 KB limit (base64 is ~33% larger than binary)
    if (imageDataUrl.length > cfg.limits.upiQrMaxBase64Length) {
      return { success: false, error: "Image too large (max 500 KB)." };
    }
  }

  try {
    await updateWorkspaceSettings(ws.workspaceId, {
      upiQrImageUrl: imageDataUrl,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: imageDataUrl ? "UPLOAD_UPI_QR" : "REMOVE_UPI_QR",
      entityType: "WORKSPACE",
      entityId: ws.workspaceId,
      details: { hasImage: !!imageDataUrl },
    });

    return { success: true };
  } catch (err) {
    logger.error(
      { err, action: "updateUpiQrImage" },
      "Failed to update UPI QR image"
    );
    return { success: false, error: "Failed to save QR image." };
  }
}

/**
 * Save or remove a custom WhatsApp message template.
 * Supported placeholders: {name}, {gym}, {amount}, {upiLink}
 * Only SUPER_ADMIN and MANAGER roles can change this.
 * Pass `null` or empty string to revert to default template.
 */
export async function updateWhatsappTemplate(
  template: string | null
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

  // Normalize: empty string → null (reverts to default)
  const normalized = template?.trim() || null;

  // Max 1000 characters
  if (normalized && normalized.length > cfg.limits.whatsappTemplateMaxLength) {
    return { success: false, error: `Template too long (max ${cfg.limits.whatsappTemplateMaxLength} characters).` };
  }

  try {
    await updateWorkspaceSettings(ws.workspaceId, {
      whatsappTemplate: normalized,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "UPDATE_WHATSAPP_TEMPLATE",
      entityType: "WORKSPACE",
      entityId: ws.workspaceId,
      details: { hasTemplate: !!normalized },
    });

    return { success: true };
  } catch (err) {
    logger.error(
      { err, action: "updateWhatsappTemplate" },
      "Failed to update WhatsApp template"
    );
    return { success: false, error: "Failed to save template." };
  }
}
