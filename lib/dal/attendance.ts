import { eq, and, isNull, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/**
 * Find the most recent open attendance session for a member in a branch
 * (checked in but not yet checked out).
 */
export async function findOpenSession(memberId: string, branchId: string) {
  const [row] = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.memberId, memberId),
        eq(attendance.branchId, branchId),
        isNull(attendance.checkedOutAt)
      )
    )
    .orderBy(desc(attendance.checkedInAt))
    .limit(1);
  return row ?? null;
}

/**
 * Create a new check-in record. Returns the attendance row ID.
 */
export async function checkIn(
  workspaceId: string,
  branchId: string,
  memberId: string
): Promise<string> {
  const start = performance.now();
  const [row] = await db
    .insert(attendance)
    .values({ workspaceId, branchId, memberId })
    .returning({ id: attendance.id });

  logger.debug(
    { fn: "checkIn", memberId, ms: Math.round(performance.now() - start) },
    "Attendance check-in created"
  );
  return row.id;
}

/**
 * Close an open session by setting checkedOutAt to now.
 */
export async function checkOut(attendanceId: string): Promise<void> {
  const start = performance.now();
  await db
    .update(attendance)
    .set({ checkedOutAt: new Date() })
    .where(eq(attendance.id, attendanceId));

  logger.debug(
    { fn: "checkOut", attendanceId, ms: Math.round(performance.now() - start) },
    "Attendance check-out recorded"
  );
}

/**
 * Hourly active member counts for today (0–23h).
 * A member is "active" in hour H if their session overlaps [H:00, H+1:00).
 * Returns an array of 24 objects: { hour: 0..23, count: number }.
 */
export async function getHourlyActivity(
  workspaceId: string,
  date?: Date
): Promise<{ hour: number; count: number }[]> {
  const start = performance.now();
  const target = date ?? new Date();
  const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayStartIso = dayStart.toISOString();
  const dayEndIso = dayEnd.toISOString();

  try {
    // Generate hours 0-23, count distinct members whose session overlaps each hour
    const rows = await db.execute(sql`
      WITH hours AS (
        SELECT generate_series(0, 23) AS h
      )
      SELECT
        hours.h AS hour,
        COUNT(DISTINCT a.member_id)::int AS count
      FROM hours
      LEFT JOIN attendance a
        ON a.workspace_id = ${workspaceId}
        AND a.checked_in_at < (${dayStartIso}::timestamp + make_interval(hours => hours.h + 1))
        AND (a.checked_out_at IS NULL OR a.checked_out_at > (${dayStartIso}::timestamp + make_interval(hours => hours.h)))
        AND a.checked_in_at >= ${dayStartIso}::timestamp
        AND a.checked_in_at < ${dayEndIso}::timestamp
      GROUP BY hours.h
      ORDER BY hours.h
    `);

    logger.debug(
      { fn: "getHourlyActivity", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );

    return (rows as unknown as { hour: number; count: number }[]).map((r) => ({
      hour: Number(r.hour),
      count: Number(r.count),
    }));
  } catch (err) {
    logger.error({ err, fn: "getHourlyActivity", workspaceId }, "DAL query failed");
    throw err;
  }
}

/**
 * Get today's total check-in count for a workspace.
 */
export async function getTodayCheckinCount(workspaceId: string): Promise<number> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(attendance)
    .where(
      and(
        eq(attendance.workspaceId, workspaceId),
        gte(attendance.checkedInAt, dayStart),
        lte(attendance.checkedInAt, now)
      )
    );

  return row?.count ?? 0;
}
