import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, branches, employeeInvites, employeeBranches, workspaceUsers, user } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/** Get all employees for a workspace (excludes 'left' by default). */
export async function getEmployees(workspaceId: string, includeLeft = false) {
  const start = performance.now();
  try {
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        phone: employees.phone,
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

    const filtered = includeLeft
      ? rows
      : rows.filter((r) => r.status !== "left");

    // Fetch assigned branches for all employees in one query
    const empIds = filtered.map((e) => e.id);
    const allAssignments = empIds.length > 0
      ? await db
          .select({
            employeeId: employeeBranches.employeeId,
            branchId: employeeBranches.branchId,
          })
          .from(employeeBranches)
          .where(inArray(employeeBranches.employeeId, empIds))
      : [];

    // Build a map: employeeId → branchId[]
    const branchMap = new Map<string, string[]>();
    for (const a of allAssignments) {
      const arr = branchMap.get(a.employeeId) ?? [];
      arr.push(a.branchId);
      branchMap.set(a.employeeId, arr);
    }

    const result = filtered.map((emp) => ({
      ...emp,
      assignedBranchIds: branchMap.get(emp.id) ?? [],
    }));

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

/** Get a single employee by ID (scoped to workspace). */
export async function getEmployeeById(workspaceId: string, employeeId: string) {
  const start = performance.now();
  try {
    const [row] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        phone: employees.phone,
        role: employees.role,
        status: employees.status,
        branchId: employees.branchId,
        branchName: branches.name,
        userId: employees.userId,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .leftJoin(branches, eq(employees.branchId, branches.id))
      .where(
        and(eq(employees.id, employeeId), eq(employees.workspaceId, workspaceId))
      )
      .limit(1);

    logger.debug(
      { fn: "getEmployeeById", workspaceId, employeeId, found: !!row, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return row ?? null;
  } catch (err) {
    logger.error({ err, fn: "getEmployeeById", workspaceId, employeeId }, "DAL query failed");
    throw err;
  }
}

/** Insert a new employee record. */
export async function insertEmployee(data: {
  workspaceId: string;
  branchId: string;
  name: string;
  email: string;
  phone?: string | null;
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
        email: data.email,
        phone: data.phone ?? null,
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

/** Check if an email is already associated with an active/invited employee in ANY workspace. */
export async function isEmployeeEmailTaken(email: string, excludeEmployeeId?: string) {
  const start = performance.now();
  try {
    const rows = await db
      .select({ id: employees.id, workspaceId: employees.workspaceId, status: employees.status })
      .from(employees)
      .where(eq(employees.email, email.toLowerCase()));

    // Filter to only active/invited (not "left")
    const active = rows.filter(
      (r) => r.status !== "left" && r.id !== excludeEmployeeId
    );

    logger.debug(
      { fn: "isEmployeeEmailTaken", email, found: active.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return active.length > 0 ? active[0] : null;
  } catch (err) {
    logger.error({ err, fn: "isEmployeeEmailTaken", email }, "DAL query failed");
    throw err;
  }
}

/** Get an employee by their linked user ID. */
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
        email: employees.email,
        phone: employees.phone,
        role: employees.role,
        status: employees.status,
      })
      .from(employees)
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

/** Update employee details (name, email, phone, role, branchId). */
export async function updateEmployee(
  workspaceId: string,
  employeeId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: "manager" | "trainer" | "receptionist";
    branchId?: string;
  }
) {
  const start = performance.now();
  try {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.email !== undefined) updates.email = data.email.toLowerCase();
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.role !== undefined) updates.role = data.role;
    if (data.branchId !== undefined) updates.branchId = data.branchId;

    if (Object.keys(updates).length === 0) return null;

    const [updated] = await db
      .update(employees)
      .set(updates)
      .where(
        and(eq(employees.id, employeeId), eq(employees.workspaceId, workspaceId))
      )
      .returning();

    logger.debug(
      { fn: "updateEmployee", workspaceId, employeeId, ms: Math.round(performance.now() - start) },
      "DAL update complete"
    );
    return updated ?? null;
  } catch (err) {
    logger.error({ err, fn: "updateEmployee", workspaceId, employeeId }, "DAL update failed");
    throw err;
  }
}

/** Mark an employee as "left" and unlink their user account + workspace_users row. */
export async function removeEmployee(workspaceId: string, employeeId: string) {
  const start = performance.now();
  try {
    // Get the employee first to find their userId
    const [emp] = await db
      .select({ userId: employees.userId })
      .from(employees)
      .where(
        and(eq(employees.id, employeeId), eq(employees.workspaceId, workspaceId))
      )
      .limit(1);

    if (!emp) return null;

    // Set employee status to "left" and unlink user
    await db
      .update(employees)
      .set({ status: "left", userId: null })
      .where(
        and(eq(employees.id, employeeId), eq(employees.workspaceId, workspaceId))
      );

    // Delete their workspace_users row if linked
    if (emp.userId) {
      await db
        .delete(workspaceUsers)
        .where(
          and(
            eq(workspaceUsers.workspaceId, workspaceId),
            eq(workspaceUsers.userId, emp.userId)
          )
        );
    }

    // Delete any pending invites
    await db
      .delete(employeeInvites)
      .where(eq(employeeInvites.employeeId, employeeId));

    logger.debug(
      { fn: "removeEmployee", workspaceId, employeeId, ms: Math.round(performance.now() - start) },
      "DAL remove complete"
    );
    return { removed: true };
  } catch (err) {
    logger.error({ err, fn: "removeEmployee", workspaceId, employeeId }, "DAL remove failed");
    throw err;
  }
}

/** Employee voluntarily leaves the gym. */
export async function employeeLeave(workspaceId: string, userId: string) {
  const start = performance.now();
  try {
    // Find the employee
    const emp = await getEmployeeByUserId(workspaceId, userId);
    if (!emp) return null;

    // Set status to "left" and unlink user
    await db
      .update(employees)
      .set({ status: "left", userId: null })
      .where(
        and(eq(employees.id, emp.id), eq(employees.workspaceId, workspaceId))
      );

    // Remove from workspace_users
    await db
      .delete(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.workspaceId, workspaceId),
          eq(workspaceUsers.userId, userId)
        )
      );

    logger.debug(
      { fn: "employeeLeave", workspaceId, userId, ms: Math.round(performance.now() - start) },
      "DAL leave complete"
    );
    return { left: true };
  } catch (err) {
    logger.error({ err, fn: "employeeLeave", workspaceId, userId }, "DAL leave failed");
    throw err;
  }
}

// ─── Invite Token DAL ───────────────────────────────────────────────────────

/** Create an invite token for an employee. Deletes any previous pending invites first. */
export async function createEmployeeInvite(data: {
  employeeId: string;
  workspaceId: string;
  email: string;
  otpHash: string;
  expiresAt: Date;
}) {
  const start = performance.now();
  try {
    // Delete old unconsumed invites for this employee
    await db
      .delete(employeeInvites)
      .where(
        and(
          eq(employeeInvites.employeeId, data.employeeId),
          eq(employeeInvites.consumed, false)
        )
      );

    const [invite] = await db
      .insert(employeeInvites)
      .values({
        employeeId: data.employeeId,
        workspaceId: data.workspaceId,
        email: data.email,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
      })
      .returning();

    logger.debug(
      { fn: "createEmployeeInvite", employeeId: data.employeeId, ms: Math.round(performance.now() - start) },
      "DAL insert complete"
    );
    return invite;
  } catch (err) {
    logger.error({ err, fn: "createEmployeeInvite", employeeId: data.employeeId }, "DAL insert failed");
    throw err;
  }
}

/** Find a pending (unconsumed, not expired) invite by employee ID. */
export async function findPendingInvite(employeeId: string) {
  const start = performance.now();
  try {
    const [invite] = await db
      .select()
      .from(employeeInvites)
      .where(
        and(
          eq(employeeInvites.employeeId, employeeId),
          eq(employeeInvites.consumed, false)
        )
      )
      .limit(1);

    if (!invite || invite.expiresAt < new Date()) return null;

    logger.debug(
      { fn: "findPendingInvite", employeeId, found: true, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return invite;
  } catch (err) {
    logger.error({ err, fn: "findPendingInvite", employeeId }, "DAL query failed");
    throw err;
  }
}

/** Find pending invite by email (for the accept-invite page). */
export async function findPendingInviteByEmail(email: string) {
  const start = performance.now();
  try {
    const rows = await db
      .select({
        id: employeeInvites.id,
        employeeId: employeeInvites.employeeId,
        workspaceId: employeeInvites.workspaceId,
        email: employeeInvites.email,
        otpHash: employeeInvites.otpHash,
        expiresAt: employeeInvites.expiresAt,
        consumed: employeeInvites.consumed,
      })
      .from(employeeInvites)
      .where(
        and(
          eq(employeeInvites.email, email.toLowerCase()),
          eq(employeeInvites.consumed, false)
        )
      );

    // Filter expired ones
    const valid = rows.filter((r) => r.expiresAt > new Date());

    logger.debug(
      { fn: "findPendingInviteByEmail", email, found: valid.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return valid.length > 0 ? valid[0] : null;
  } catch (err) {
    logger.error({ err, fn: "findPendingInviteByEmail", email }, "DAL query failed");
    throw err;
  }
}

/** Consume an invite and link the employee to the user. Also creates workspace_users row. */
export async function acceptEmployeeInvite(
  inviteId: string,
  employeeId: string,
  workspaceId: string,
  userId: string
) {
  const start = performance.now();
  try {
    // Mark invite consumed
    await db
      .update(employeeInvites)
      .set({ consumed: true })
      .where(eq(employeeInvites.id, inviteId));

    // Get employee to determine role and branch
    const [emp] = await db
      .select({ role: employees.role, branchId: employees.branchId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!emp) throw new Error("Employee not found");

    // Map employee_role to workspace_role
    const roleMap: Record<string, "MANAGER" | "RECEPTIONIST" | "TRAINER"> = {
      manager: "MANAGER",
      receptionist: "RECEPTIONIST",
      trainer: "TRAINER",
    };

    // Link employee to auth user and set active
    await db
      .update(employees)
      .set({ userId, status: "active" })
      .where(eq(employees.id, employeeId));

    // Create workspace_users row
    await db.insert(workspaceUsers).values({
      workspaceId,
      userId,
      role: roleMap[emp.role] ?? "RECEPTIONIST",
      assignedBranchId: emp.branchId,
    });

    logger.debug(
      { fn: "acceptEmployeeInvite", employeeId, userId, ms: Math.round(performance.now() - start) },
      "DAL accept complete"
    );
    return { accepted: true };
  } catch (err) {
    logger.error({ err, fn: "acceptEmployeeInvite", employeeId }, "DAL accept failed");
    throw err;
  }
}

// ─── Employee ↔ Branch (many-to-many) ───────────────────────────────────────

/** Get all branch IDs an employee is assigned to (from employee_branches). */
export async function getEmployeeBranchIds(employeeId: string): Promise<string[]> {
  const start = performance.now();
  try {
    const rows = await db
      .select({ branchId: employeeBranches.branchId })
      .from(employeeBranches)
      .where(eq(employeeBranches.employeeId, employeeId));

    logger.debug(
      { fn: "getEmployeeBranchIds", employeeId, count: rows.length, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return rows.map((r) => r.branchId);
  } catch (err) {
    logger.error({ err, fn: "getEmployeeBranchIds", employeeId }, "DAL query failed");
    throw err;
  }
}

/** Get all branches (with name) an employee has access to. Falls back to primary branchId. */
export async function getEmployeeBranches(
  employeeId: string,
  workspaceId: string
): Promise<{ id: string; name: string }[]> {
  const start = performance.now();
  try {
    const rows = await db
      .select({ id: branches.id, name: branches.name })
      .from(employeeBranches)
      .innerJoin(branches, eq(employeeBranches.branchId, branches.id))
      .where(eq(employeeBranches.employeeId, employeeId));

    if (rows.length > 0) {
      logger.debug(
        { fn: "getEmployeeBranches", employeeId, count: rows.length, ms: Math.round(performance.now() - start) },
        "DAL query complete"
      );
      return rows;
    }

    // Fallback: use the primary branchId from employees table
    const [emp] = await db
      .select({ branchId: employees.branchId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!emp) return [];

    const [branch] = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(and(eq(branches.id, emp.branchId), eq(branches.workspaceId, workspaceId)))
      .limit(1);

    logger.debug(
      { fn: "getEmployeeBranches", employeeId, fallback: true, ms: Math.round(performance.now() - start) },
      "DAL query complete"
    );
    return branch ? [branch] : [];
  } catch (err) {
    logger.error({ err, fn: "getEmployeeBranches", employeeId }, "DAL query failed");
    throw err;
  }
}

/** Replace all branch assignments for an employee. */
export async function setEmployeeBranches(
  employeeId: string,
  branchIds: string[]
): Promise<void> {
  const start = performance.now();
  try {
    // Delete existing
    await db
      .delete(employeeBranches)
      .where(eq(employeeBranches.employeeId, employeeId));

    // Insert new
    if (branchIds.length > 0) {
      await db.insert(employeeBranches).values(
        branchIds.map((branchId) => ({ employeeId, branchId }))
      );
    }

    logger.debug(
      { fn: "setEmployeeBranches", employeeId, count: branchIds.length, ms: Math.round(performance.now() - start) },
      "DAL set complete"
    );
  } catch (err) {
    logger.error({ err, fn: "setEmployeeBranches", employeeId }, "DAL set failed");
    throw err;
  }
}
