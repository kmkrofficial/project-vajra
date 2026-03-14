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

  try {
    // Create member with PENDING_PAYMENT status
    const member = await insertMember({
      workspaceId: ws.workspaceId,
      branchId: data.branchId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      checkinPin: generatePin(),
    });

    // Create a pending transaction
    const txn = await insertTransaction({
      workspaceId: ws.workspaceId,
      memberId: member.id,
      planId: data.planId,
      amount: plan.price,
      paymentMethod: "UPI",
    });

    // Build UPI deep link string
    const upiPa = workspace.ownerUpiId || "";
    const upiPn = encodeURIComponent(workspace.name);
    const upiString = `upi://pay?pa=${upiPa}&pn=${upiPn}&am=${plan.price}&cu=INR`;

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
    console.error("[createMember]", err);
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

    revalidatePath("/app/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[markAsPaid]", err);
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
