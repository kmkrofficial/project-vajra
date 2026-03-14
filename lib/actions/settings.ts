"use server";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { getWorkspaceConfig, upsertWorkspaceConfig } from "@/lib/dal/config";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

type ActionResult = { success: boolean; error?: string };

// ─── PIN Hashing (scrypt + random salt) ─────────────────────────────────────

const SCRYPT_KEYLEN = 64;

/** Hash a PIN with a random 16-byte salt. Returns "salt:hash" hex string. */
function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

/** Constant-time comparison of a plain PIN against a "salt:hash" string. */
function verifyHash(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(pin, salt, SCRYPT_KEYLEN);
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

// ─── Server Actions ─────────────────────────────────────────────────────────

/**
 * Set or update the kiosk exit PIN (hashed).
 * Only SUPER_ADMIN and MANAGER roles can call this.
 */
export async function setupKioskPin(pin: string): Promise<ActionResult> {
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
    const hashed = hashPin(pin);
    await upsertWorkspaceConfig(ws.workspaceId, ws.branchId ?? null, {
      kioskPin: hashed,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "KIOSK_PIN_CREATED_OR_UPDATED",
      entityType: "CONFIGURATION",
      entityId: ws.branchId ?? ws.workspaceId,
      details: { note: "Kiosk exit PIN hashed and saved" },
    });

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "setupKioskPin" }, "Failed to set kiosk PIN");
    return { success: false, error: "Failed to save PIN." };
  }
}

/**
 * Verify a kiosk exit PIN against the stored hash.
 * Any authenticated workspace member can call this (used by kiosk exit).
 */
export async function verifyKioskPin(pin: string): Promise<ActionResult> {
  if (!pin) return { success: false, error: "PIN is required." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  try {
    const config = await getWorkspaceConfig(ws.workspaceId, ws.branchId);

    if (!config?.kioskPin) {
      return { success: false, error: "Kiosk PIN not configured." };
    }

    if (!verifyHash(pin, config.kioskPin)) {
      return { success: false, error: "Incorrect PIN." };
    }

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "verifyKioskPin" }, "Kiosk PIN verification failed");
    return { success: false, error: "Verification failed." };
  }
}
