import { eq, and, gte, lte, sql, count, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, transactions, plans } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import cfg from "@/lib/config";

/**
 * Analytics queries scoped to a workspace.
 */

/** Count active members in a workspace, optionally filtered by branch. */
export async function getActiveMemberCount(workspaceId: string, branchId?: string | null): Promise<number> {
  const start = performance.now();
  try {
    const conditions = [
      eq(members.workspaceId, workspaceId),
      eq(members.status, "ACTIVE"),
    ];
    if (branchId) conditions.push(eq(members.branchId, branchId));

    const [row] = await db
      .select({ count: count() })
      .from(members)
      .where(and(...conditions));

    logger.debug(
      { fn: "getActiveMemberCount", workspaceId, branchId, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return row?.count ?? 0;
  } catch (err) {
    logger.error({ err, fn: "getActiveMemberCount", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Sum of completed transactions this calendar month, optionally filtered by branch (via member's branch). */
export async function getMonthlyRevenue(workspaceId: string, branchId?: string | null): Promise<number> {
  const start = performance.now();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    if (branchId) {
      // Join through members to filter by branch
      const [row] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .innerJoin(members, eq(transactions.memberId, members.id))
        .where(
          and(
            eq(transactions.workspaceId, workspaceId),
            eq(transactions.status, "COMPLETED"),
            gte(transactions.createdAt, firstOfMonth),
            eq(members.branchId, branchId)
          )
        );

      logger.debug(
        { fn: "getMonthlyRevenue", workspaceId, branchId, ms: Math.round(performance.now() - start) },
        "DAL query complete"
      );
      return Number(row?.total ?? 0);
    }

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

/** Count members expiring within the next N days, optionally filtered by branch. */
export async function getExpiringMemberCount(
  workspaceId: string,
  days: number = cfg.analytics.expiringSoonDays,
  branchId?: string | null
): Promise<number> {
  const start = performance.now();
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);

  try {
    const conditions = [
      eq(members.workspaceId, workspaceId),
      eq(members.status, "ACTIVE"),
      gte(members.expiryDate, now),
      lte(members.expiryDate, future),
    ];
    if (branchId) conditions.push(eq(members.branchId, branchId));

    const [row] = await db
      .select({ count: count() })
      .from(members)
      .where(and(...conditions));

    logger.debug(
      { fn: "getExpiringMemberCount", workspaceId, days, branchId, ms: Math.round(performance.now() - start) },
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
  months: number = cfg.analytics.revenueChartMonths
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

/** Count members who churned (expired in the configurable churn window without renewal). */
export async function getChurnCount(workspaceId: string): Promise<number> {
  const start = performance.now();
  const now = new Date();
  const churnCutoff = new Date();
  churnCutoff.setDate(now.getDate() - cfg.analytics.churnWindowDays);

  try {
    const [row] = await db
      .select({ count: count() })
      .from(members)
      .where(
        and(
          eq(members.workspaceId, workspaceId),
          eq(members.status, "EXPIRED"),
          gte(members.expiryDate, churnCutoff),
          lte(members.expiryDate, now)
        )
      );

    logger.debug(
      { fn: "getChurnCount", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return row?.count ?? 0;
  } catch (err) {
    logger.error({ err, fn: "getChurnCount", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Revenue sum for a specific date range. */
async function getRevenueForPeriod(
  workspaceId: string,
  from: Date,
  to: Date
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.status, "COMPLETED"),
        gte(transactions.createdAt, from),
        lte(transactions.createdAt, to)
      )
    );
  return Number(row?.total ?? 0);
}

/** Month-over-month revenue growth percentage. Returns null if no previous data. */
export async function getMoMGrowth(workspaceId: string): Promise<number | null> {
  const start = performance.now();
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  try {
    const [current, previous] = await Promise.all([
      getRevenueForPeriod(workspaceId, firstOfThisMonth, now),
      getRevenueForPeriod(workspaceId, firstOfLastMonth, firstOfThisMonth),
    ]);

    logger.debug(
      { fn: "getMoMGrowth", workspaceId, current, previous, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );

    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  } catch (err) {
    logger.error({ err, fn: "getMoMGrowth", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Week-over-week revenue growth percentage. Returns null if no previous data. */
export async function getWoWGrowth(workspaceId: string): Promise<number | null> {
  const start = performance.now();
  const now = new Date();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - cfg.analytics.wowGrowthDays);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(now.getDate() - cfg.analytics.wowGrowthDays * 2);

  try {
    const [current, previous] = await Promise.all([
      getRevenueForPeriod(workspaceId, sevenDaysAgo, now),
      getRevenueForPeriod(workspaceId, fourteenDaysAgo, sevenDaysAgo),
    ]);

    logger.debug(
      { fn: "getWoWGrowth", workspaceId, current, previous, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );

    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  } catch (err) {
    logger.error({ err, fn: "getWoWGrowth", workspaceId }, "DAL query failed");
    throw err;
  }
}

/**
 * Get a full analytics snapshot for the workspace.
 * Runs queries in parallel for fast loading.
 */
export async function getWorkspaceAnalytics(workspaceId: string, branchId?: string | null) {
  const [activeMembers, monthlyRevenue, expiringIn7Days, revenueByMonth, churnCount, momGrowth, wowGrowth] =
    await Promise.all([
      getActiveMemberCount(workspaceId, branchId),
      getMonthlyRevenue(workspaceId, branchId),
      getExpiringMemberCount(workspaceId, cfg.analytics.expiringSoonDays, branchId),
      getRevenueByMonth(workspaceId, cfg.analytics.revenueChartMonths),
      getChurnCount(workspaceId),
      getMoMGrowth(workspaceId),
      getWoWGrowth(workspaceId),
    ]);

  return {
    activeMembers,
    monthlyRevenue,
    expiringIn7Days,
    revenueByMonth,
    churnCount,
    momGrowth,
    wowGrowth,
  };
}
