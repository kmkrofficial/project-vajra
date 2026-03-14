import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, transactions } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/**
 * Analytics queries scoped to a workspace.
 */

/** Count active members in a workspace. */
export async function getActiveMemberCount(workspaceId: string): Promise<number> {
  const start = performance.now();
  try {
    const [row] = await db
      .select({ count: count() })
      .from(members)
      .where(
        and(eq(members.workspaceId, workspaceId), eq(members.status, "ACTIVE"))
      );

    logger.debug(
      { fn: "getActiveMemberCount", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return row?.count ?? 0;
  } catch (err) {
    logger.error({ err, fn: "getActiveMemberCount", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Sum of completed transactions this calendar month. */
export async function getMonthlyRevenue(workspaceId: string): Promise<number> {
  const start = performance.now();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, workspaceId),
          eq(transactions.status, "COMPLETED"),
          gte(transactions.createdAt, firstOfMonth)
        )
      );

    logger.debug(
      { fn: "getMonthlyRevenue", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return Number(row?.total ?? 0);
  } catch (err) {
    logger.error({ err, fn: "getMonthlyRevenue", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Count members expiring within the next N days. */
export async function getExpiringMemberCount(
  workspaceId: string,
  days: number = 7
): Promise<number> {
  const start = performance.now();
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);

  try {
    const [row] = await db
      .select({ count: count() })
      .from(members)
      .where(
        and(
          eq(members.workspaceId, workspaceId),
          eq(members.status, "ACTIVE"),
          gte(members.expiryDate, now),
          lte(members.expiryDate, future)
        )
      );

    logger.debug(
      { fn: "getExpiringMemberCount", workspaceId, days, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return row?.count ?? 0;
  } catch (err) {
    logger.error({ err, fn: "getExpiringMemberCount", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Revenue per month for the last 6 months. Returns [{ month: "Jan", revenue: 5000 }, ...]. */
export async function getRevenueByMonth(
  workspaceId: string,
  months: number = 6
): Promise<{ month: string; revenue: number }[]> {
  const start = performance.now();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  try {
    const rows = await db
      .select({
        monthLabel: sql<string>`TO_CHAR(${transactions.createdAt}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${transactions.createdAt})`,
        yearNum: sql<number>`EXTRACT(YEAR FROM ${transactions.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, workspaceId),
          eq(transactions.status, "COMPLETED"),
          gte(transactions.createdAt, cutoff)
        )
      )
      .groupBy(
        sql`TO_CHAR(${transactions.createdAt}, 'Mon')`,
        sql`EXTRACT(MONTH FROM ${transactions.createdAt})`,
        sql`EXTRACT(YEAR FROM ${transactions.createdAt})`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${transactions.createdAt})`,
        sql`EXTRACT(MONTH FROM ${transactions.createdAt})`
      );

    logger.debug(
      { fn: "getRevenueByMonth", workspaceId, rowCount: rows.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );

    return rows.map((r) => ({
      month: String(r.monthLabel).trim(),
      revenue: Number(r.revenue),
    }));
  } catch (err) {
    logger.error({ err, fn: "getRevenueByMonth", workspaceId }, "DAL query failed");
    throw err;
  }
}

/**
 * Get a full analytics snapshot for the workspace.
 * Runs queries in parallel for fast loading.
 */
export async function getWorkspaceAnalytics(workspaceId: string) {
  const [activeMembers, monthlyRevenue, expiringIn7Days, revenueByMonth] =
    await Promise.all([
      getActiveMemberCount(workspaceId),
      getMonthlyRevenue(workspaceId),
      getExpiringMemberCount(workspaceId, 7),
      getRevenueByMonth(workspaceId, 6),
    ]);

  return {
    activeMembers,
    monthlyRevenue,
    expiringIn7Days,
    revenueByMonth,
  };
}
