import { eq, and, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, transactions } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/** Get all members for a workspace. */
export async function getMembers(workspaceId: string) {
  const start = performance.now();
  try {
    const result = await db
      .select()
      .from(members)
      .where(eq(members.workspaceId, workspaceId))
      .orderBy(members.createdAt);

    logger.debug({ fn: "getMembers", workspaceId, count: result.length, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return result;
  } catch (err) {
    logger.error({ err, fn: "getMembers", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Get a single member by ID, scoped to workspace. */
export async function getMemberById(memberId: string, workspaceId: string) {
  const start = performance.now();
  try {
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.workspaceId, workspaceId)))
      .limit(1);

    logger.debug({ fn: "getMemberById", workspaceId, memberId, found: !!member, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return member ?? null;
  } catch (err) {
    logger.error({ err, fn: "getMemberById", workspaceId, memberId }, "DAL query failed");
    throw err;
  }
}

/** Look up a member by check-in PIN within a specific branch. */
export async function getMemberByPin(pin: string, branchId: string) {
  const start = performance.now();
  try {
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.checkinPin, pin), eq(members.branchId, branchId)))
      .limit(1);

    logger.debug({ fn: "getMemberByPin", branchId, found: !!member, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return member ?? null;
  } catch (err) {
    logger.error({ err, fn: "getMemberByPin", branchId }, "DAL query failed");
    throw err;
  }
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
  const start = performance.now();
  try {
    const [member] = await db
      .insert(members)
      .values({
        ...data,
        status: "PENDING_PAYMENT",
      })
      .returning();

    logger.debug({ fn: "insertMember", workspaceId: data.workspaceId, memberId: member.id, ms: Math.round(performance.now() - start) }, "DAL insert complete");
    return member;
  } catch (err) {
    logger.error({ err, fn: "insertMember", workspaceId: data.workspaceId }, "DAL insert failed");
    throw err;
  }
}

/** Create a pending transaction for a member. */
export async function insertTransaction(data: {
  workspaceId: string;
  memberId: string;
  planId: string;
  amount: number;
  paymentMethod: "UPI" | "CASH";
}) {
  const start = performance.now();
  try {
    const [txn] = await db
      .insert(transactions)
      .values({
        ...data,
        status: "PENDING",
      })
      .returning();

    logger.debug({ fn: "insertTransaction", workspaceId: data.workspaceId, transactionId: txn.id, ms: Math.round(performance.now() - start) }, "DAL insert complete");
    return txn;
  } catch (err) {
    logger.error({ err, fn: "insertTransaction", workspaceId: data.workspaceId }, "DAL insert failed");
    throw err;
  }
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
  const start = performance.now();
  try {
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

    logger.debug(
      { fn: "completeTransaction", workspaceId, transactionId, memberId: txn.memberId, ms: Math.round(performance.now() - start) },
      "DAL transaction complete"
    );
    return { transaction: txn, member };
  } catch (err) {
    logger.error({ err, fn: "completeTransaction", workspaceId, transactionId }, "DAL transaction failed");
    throw err;
  }
}

/** Get a transaction by ID, scoped to workspace. */
export async function getTransactionById(
  transactionId: string,
  workspaceId: string
) {
  const start = performance.now();
  try {
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

    logger.debug({ fn: "getTransactionById", workspaceId, transactionId, found: !!txn, ms: Math.round(performance.now() - start) }, "DAL query complete");
    return txn ?? null;
  } catch (err) {
    logger.error({ err, fn: "getTransactionById", workspaceId, transactionId }, "DAL query failed");
    throw err;
  }
}

/**
 * Mark all ACTIVE members whose expiry_date has passed as EXPIRED.
 * Returns the count of rows updated (for logging).
 */
export async function markExpiredMembers(): Promise<number> {
  const now = new Date();
  const start = performance.now();

  try {
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

    logger.info({ fn: "markExpiredMembers", count: result.length, ms: Math.round(performance.now() - start) }, "Expired members marked");
    return result.length;
  } catch (err) {
    logger.error({ err, fn: "markExpiredMembers" }, "DAL expiry update failed");
    throw err;
  }
}
