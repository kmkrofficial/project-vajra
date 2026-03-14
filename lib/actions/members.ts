"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getPlanById } from "@/lib/dal/plans";
import {
  insertMember,
  insertTransaction,
  completeTransaction,
  getMemberById,
  getMembers,
} from "@/lib/dal/members";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";
import { memberFormSchema } from "@/lib/validations";

type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};

/** Generate a random 4-digit checkin PIN. */
function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createMember(data: {
  name: string;
  phone: string;
  email?: string;
  kioskPin?: string;
  planId: string;
  branchId: string;
}): Promise<
  ActionResult<{
    memberId: string;
    transactionId: string;
    upiString: string;
    amount: number;
  }>
> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  // Server-side validation
  const parsed = memberFormSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(
    ws.workspaceId,
    session.user.id
  );
  if (!membership) {
    return { success: false, error: "Insufficient permissions." };
  }

  // Look up the plan
  const plan = await getPlanById(data.planId, ws.workspaceId);
  if (!plan || !plan.active) {
    return { success: false, error: "Invalid or inactive plan." };
  }

  // Get workspace details for UPI string
  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) {
    return { success: false, error: "Workspace not found." };
  }

  // Use provided kiosk PIN or auto-generate a random 4-digit PIN
  const checkinPin = parsed.data.kioskPin || generatePin();

  try {
    // Create member with PENDING_PAYMENT status
    const member = await insertMember({
      workspaceId: ws.workspaceId,
      branchId: data.branchId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      checkinPin,
    });

    // Create a pending transaction
    const txn = await insertTransaction({
      workspaceId: ws.workspaceId,
      memberId: member.id,
      planId: data.planId,
      amount: plan.price,
      paymentMethod: "UPI",
    });

    // Build strict raw UPI intent string — no encoding, no expiry params
    const upiPa = workspace.ownerUpiId || "";
    const upiPn = workspace.name;
    const upiString = `upi://pay?pa=${upiPa}&pn=${upiPn}&am=${plan.price}&cu=INR`;

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "CREATE_MEMBER",
      entityType: "MEMBER",
      entityId: member.id,
      details: { transactionId: txn.id, planId: data.planId, amount: plan.price },
    });

    return {
      success: true,
      data: {
        memberId: member.id,
        transactionId: txn.id,
        upiString,
        amount: plan.price,
      },
    };
  } catch (err) {
    logger.error({ err, action: "create_member", workspaceId: ws.workspaceId, userId: session.user.id }, "Failed to create member");
    return { success: false, error: "Failed to create member." };
  }
}

export async function markAsPaid(
  transactionId: string,
  durationDays: number
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(
    ws.workspaceId,
    session.user.id
  );
  if (!membership) {
    return { success: false, error: "Insufficient permissions." };
  }

  try {
    const result = await completeTransaction(
      transactionId,
      ws.workspaceId,
      durationDays
    );
    if (!result) {
      return { success: false, error: "Transaction not found." };
    }

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "MARK_AS_PAID",
      entityType: "TRANSACTION",
      entityId: transactionId,
      details: { durationDays },
    });

    revalidatePath("/app/dashboard");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "mark_as_paid", workspaceId: ws.workspaceId, userId: session.user.id, transactionId }, "Failed to complete payment");
    return { success: false, error: "Failed to complete payment." };
  }
}

export async function fetchMembers() {
  const session = await getSession();
  if (!session?.user) return [];

  const ws = await getActiveWorkspace();
  if (!ws) return [];

  return getMembers(ws.workspaceId);
}

export async function fetchMember(memberId: string) {
  const session = await getSession();
  if (!session?.user) return null;

  const ws = await getActiveWorkspace();
  if (!ws) return null;

  return getMemberById(memberId, ws.workspaceId);
}
