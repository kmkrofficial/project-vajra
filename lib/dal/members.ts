import { eq, and, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, transactions } from "@/lib/db/schema";

/** Get all members for a workspace. */
export async function getMembers(workspaceId: string) {
  return db
    .select()
    .from(members)
    .where(eq(members.workspaceId, workspaceId))
    .orderBy(members.createdAt);
}

/** Get a single member by ID, scoped to workspace. */
export async function getMemberById(memberId: string, workspaceId: string) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.workspaceId, workspaceId)))
    .limit(1);

  return member ?? null;
}

/** Look up a member by check-in PIN within a specific branch. */
export async function getMemberByPin(pin: string, branchId: string) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.checkinPin, pin), eq(members.branchId, branchId)))
    .limit(1);

  return member ?? null;
}

/** Insert a new member with PENDING_PAYMENT status. */
export async function insertMember(data: {
  workspaceId: string;
  branchId: string;
  name: string;
  phone: string;
  email?: string | null;
  checkinPin: string;
}) {
  const [member] = await db
    .insert(members)
    .values({
      ...data,
      status: "PENDING_PAYMENT",
    })
    .returning();

  return member;
}

/** Create a pending transaction for a member. */
export async function insertTransaction(data: {
  workspaceId: string;
  memberId: string;
  planId: string;
  amount: number;
  paymentMethod: "UPI" | "CASH";
}) {
  const [txn] = await db
    .insert(transactions)
    .values({
      ...data,
      status: "PENDING",
    })
    .returning();

  return txn;
}

/**
 * Mark a transaction as COMPLETED and activate the member.
 * Sets `expiryDate` = now + durationDays.
 */
export async function completeTransaction(
  transactionId: string,
  workspaceId: string,
  durationDays: number
) {
  // Update transaction status
  const [txn] = await db
    .update(transactions)
    .set({ status: "COMPLETED" })
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.workspaceId, workspaceId)
      )
    )
    .returning();

  if (!txn) return null;

  // Calculate expiry date
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + durationDays);

  // Activate the member
  const [member] = await db
    .update(members)
    .set({ status: "ACTIVE", expiryDate: expiry })
    .where(
      and(
        eq(members.id, txn.memberId),
        eq(members.workspaceId, workspaceId)
      )
    )
    .returning();

  return { transaction: txn, member };
}

/** Get a transaction by ID, scoped to workspace. */
export async function getTransactionById(
  transactionId: string,
  workspaceId: string
) {
  const [txn] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.workspaceId, workspaceId)
      )
    )
    .limit(1);

  return txn ?? null;
}

/**
 * Mark all ACTIVE members whose expiry_date has passed as EXPIRED.
 * Returns the count of rows updated (for logging).
 */
export async function markExpiredMembers(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(members)
    .set({ status: "EXPIRED" })
    .where(
      and(
        eq(members.status, "ACTIVE"),
        lt(members.expiryDate, now)
      )
    )
    .returning({ id: members.id });

  return result.length;
}
