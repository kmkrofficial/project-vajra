import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, employeeAttendance, branches } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/** Get all employees for a workspace. */
export async function getEmployees(workspaceId: string) {
  const start = performance.now();
  try {
    const result = await db
      .select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        status: employees.status,
        branchId: employees.branchId,
        branchName: branches.name,
        userId: employees.userId,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .leftJoin(branches, eq(employees.branchId, branches.id))
      .where(eq(employees.workspaceId, workspaceId))
      .orderBy(employees.createdAt);

    logger.debug(
      { fn: "getEmployees", workspaceId, count: result.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return result;
  } catch (err) {
    logger.error({ err, fn: "getEmployees", workspaceId }, "DAL query failed");
    throw err;
  }
}

/** Get attendance records for a specific employee. */
export async function getEmployeeAttendance(
  workspaceId: string,
  employeeId: string
) {
  const start = performance.now();
  try {
    const result = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.workspaceId, workspaceId),
          eq(employeeAttendance.employeeId, employeeId)
        )
      )
      .orderBy(desc(employeeAttendance.checkInTime));

    logger.debug(
      { fn: "getEmployeeAttendance", workspaceId, employeeId, count: result.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return result;
  } catch (err) {
    logger.error({ err, fn: "getEmployeeAttendance", workspaceId, employeeId }, "DAL query failed");
    throw err;
  }
}

/** Insert a new employee record. */
export async function insertEmployee(data: {
  workspaceId: string;
  branchId: string;
  name: string;
  role: "manager" | "trainer" | "receptionist";
  userId?: string | null;
  status?: "active" | "invited";
}) {
  const start = performance.now();
  try {
    const [employee] = await db
      .insert(employees)
      .values({
        workspaceId: data.workspaceId,
        branchId: data.branchId,
        name: data.name,
        role: data.role,
        userId: data.userId ?? null,
        status: data.status ?? "invited",
      })
      .returning();

    logger.debug(
      { fn: "insertEmployee", workspaceId: data.workspaceId, employeeId: employee.id, ms: Math.round(performance.now() - start) },
      "DAL insert complete"
    );
    return employee;
  } catch (err) {
    logger.error({ err, fn: "insertEmployee", workspaceId: data.workspaceId }, "DAL insert failed");
    throw err;
  }
}

/** Insert an attendance record (check-in). */
export async function insertAttendance(data: {
  workspaceId: string;
  branchId: string;
  employeeId: string;
  checkInLat: string;
  checkInLng: string;
}) {
  const start = performance.now();
  try {
    const [record] = await db
      .insert(employeeAttendance)
      .values({
        workspaceId: data.workspaceId,
        branchId: data.branchId,
        employeeId: data.employeeId,
        checkInLat: data.checkInLat,
        checkInLng: data.checkInLng,
      })
      .returning();

    logger.debug(
      { fn: "insertAttendance", workspaceId: data.workspaceId, recordId: record.id, ms: Math.round(performance.now() - start) },
      "DAL insert complete"
    );
    return record;
  } catch (err) {
    logger.error({ err, fn: "insertAttendance", workspaceId: data.workspaceId }, "DAL insert failed");
    throw err;
  }
}

/** Get an employee by their linked user ID (for check-in lookup). */
export async function getEmployeeByUserId(
  workspaceId: string,
  userId: string
) {
  const start = performance.now();
  try {
    const [employee] = await db
      .select({
        id: employees.id,
        branchId: employees.branchId,
        name: employees.name,
        role: employees.role,
        status: employees.status,
        branchLat: branches.latitude,
        branchLng: branches.longitude,
      })
      .from(employees)
      .leftJoin(branches, eq(employees.branchId, branches.id))
      .where(
        and(
          eq(employees.workspaceId, workspaceId),
          eq(employees.userId, userId)
        )
      )
      .limit(1);

    logger.debug(
      { fn: "getEmployeeByUserId", workspaceId, userId, found: !!employee, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return employee ?? null;
  } catch (err) {
    logger.error({ err, fn: "getEmployeeByUserId", workspaceId, userId }, "DAL query failed");
    throw err;
  }
}

/** Update an employee's role. Returns the old role or null if not found. */
export async function updateEmployeeRole(
  workspaceId: string,
  employeeId: string,
  newRole: "manager" | "trainer" | "receptionist"
): Promise<{ oldRole: string } | null> {
  const start = performance.now();
  try {
    // Fetch old role first
    const [existing] = await db
      .select({ role: employees.role })
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!existing) return null;

    const oldRole = existing.role;

    await db
      .update(employees)
      .set({ role: newRole })
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.workspaceId, workspaceId)
        )
      );

    logger.debug(
      { fn: "updateEmployeeRole", workspaceId, employeeId, oldRole, newRole, ms: Math.round(performance.now() - start) },
      "DAL update complete"
    );
    return { oldRole };
  } catch (err) {
    logger.error({ err, fn: "updateEmployeeRole", workspaceId, employeeId }, "DAL update failed");
    throw err;
  }
}
