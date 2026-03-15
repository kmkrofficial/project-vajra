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
 * Average hourly check-in counts across all recorded days.
 * Gives an overall estimate of typical gym traffic per hour (0–23h).
 * Counts the total check-ins per hour bucket, then divides by the number
 * of distinct days that have any attendance data.
 * Hours are computed in the server's local timezone.
 */
export async function getAverageHourlyActivity(
  workspaceId: string
): Promise<{ hour: number; count: number }[]> {
  const start = performance.now();
  // Convert UTC timestamps to local time by adding the server's UTC offset
  const offsetMinutes = -(new Date().getTimezoneOffset()); // positive for east of UTC

  try {
    const rows = await db.execute(sql`
      WITH hourly_counts AS (
        SELECT
          EXTRACT(HOUR FROM checked_in_at + make_interval(mins => ${offsetMinutes}))::int AS h,
          (checked_in_at + make_interval(mins => ${offsetMinutes}))::date AS d,
          COUNT(*)::int AS cnt
        FROM attendance
        WHERE workspace_id = ${workspaceId}
        GROUP BY h, d
      ),
      total_days AS (
        SELECT COUNT(DISTINCT d)::int AS num_days FROM hourly_counts
      ),
      hours AS (
        SELECT generate_series(0, 23) AS h
      )
      SELECT
        hours.h AS hour,
        COALESCE(ROUND(SUM(hc.cnt)::numeric / GREATEST(td.num_days, 1)), 0)::int AS count
      FROM hours
      CROSS JOIN total_days td
      LEFT JOIN hourly_counts hc ON hc.h = hours.h
      GROUP BY hours.h, td.num_days
      ORDER BY hours.h
    `);

    logger.debug(
      { fn: "getAverageHourlyActivity", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );

    return (rows as unknown as { hour: number; count: number }[]).map((r) => ({
      hour: Number(r.hour),
      count: Number(r.count),
    }));
  } catch (err) {
    logger.error({ err, fn: "getAverageHourlyActivity", workspaceId }, "DAL query failed");
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

/**
 * Google-style "Popular Times" data: average hourly check-ins per day of week.
 * Returns 7 entries (0=Sunday .. 6=Saturday), each with 24 hourly averages.
 * Only hours 5–22 are practically useful for gyms.
 */
export async function getPopularTimes(
  workspaceId: string
): Promise<{ dow: number; hours: { hour: number; avg: number }[] }[]> {
  const start = performance.now();
  const offsetMinutes = -(new Date().getTimezoneOffset());

  try {
    const rows = await db.execute(sql`
      WITH local_checkins AS (
        SELECT
          EXTRACT(DOW FROM checked_in_at + make_interval(mins => ${offsetMinutes}))::int AS dow,
          EXTRACT(HOUR FROM checked_in_at + make_interval(mins => ${offsetMinutes}))::int AS h,
          (checked_in_at + make_interval(mins => ${offsetMinutes}))::date AS d
        FROM attendance
        WHERE workspace_id = ${workspaceId}
      ),
      hourly_counts AS (
        SELECT dow, h, d, COUNT(*)::int AS cnt
        FROM local_checkins
        GROUP BY dow, h, d
      ),
      days_per_dow AS (
        SELECT dow, COUNT(DISTINCT d)::int AS num_days
        FROM local_checkins
        GROUP BY dow
      ),
      grid AS (
        SELECT d.dow, hours.h
        FROM (SELECT generate_series(0, 6) AS dow) d
        CROSS JOIN (SELECT generate_series(0, 23) AS h) hours
      )
      SELECT
        grid.dow,
        grid.h AS hour,
        COALESCE(
          ROUND(SUM(hc.cnt)::numeric / GREATEST(dpd.num_days, 1)),
          0
        )::int AS avg
      FROM grid
      LEFT JOIN hourly_counts hc ON hc.dow = grid.dow AND hc.h = grid.h
      LEFT JOIN days_per_dow dpd ON dpd.dow = grid.dow
      GROUP BY grid.dow, grid.h, dpd.num_days
      ORDER BY grid.dow, grid.h
    `);

    // Group flat rows into per-day arrays
    const dayMap = new Map<number, { hour: number; avg: number }[]>();
    for (let d = 0; d < 7; d++) dayMap.set(d, []);

    for (const r of rows as unknown as { dow: number; hour: number; avg: number }[]) {
      dayMap.get(Number(r.dow))!.push({ hour: Number(r.hour), avg: Number(r.avg) });
    }

    const result = Array.from(dayMap.entries()).map(([dow, hours]) => ({ dow, hours }));

    logger.debug(
      { fn: "getPopularTimes", workspaceId, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return result;
  } catch (err) {
    logger.error({ err, fn: "getPopularTimes", workspaceId }, "DAL query failed");
    throw err;
  }
}
