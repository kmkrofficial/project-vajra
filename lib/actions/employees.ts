"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { insertEmployee, updateEmployeeRole } from "@/lib/dal/employees";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

type ActionResult = { success: boolean; error?: string };

/** Add/invite an employee. Only SUPER_ADMIN and MANAGER roles can do this. */
export async function addEmployeeAction(data: {
  name: string;
  role: string;
  branchId: string;
}): Promise<ActionResult> {
  if (!data.name || data.name.trim().length < 2) {
    return { success: false, error: "Name must be at least 2 characters." };
  }

  const validRoles = ["manager", "trainer", "receptionist"];
  if (!validRoles.includes(data.role)) {
    return { success: false, error: "Invalid role." };
  }

  if (!data.branchId) {
    return { success: false, error: "Please select a branch." };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || !["SUPER_ADMIN", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "Only admins can add employees." };
  }

  try {
    const employee = await insertEmployee({
      workspaceId: ws.workspaceId,
      branchId: data.branchId,
      name: data.name.trim(),
      role: data.role as "manager" | "trainer" | "receptionist",
      status: "invited",
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "ADD_EMPLOYEE",
      entityType: "EMPLOYEE",
      entityId: employee.id,
      details: { name: data.name, role: data.role, branchId: data.branchId },
    });

    revalidatePath("/app/employees");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "addEmployeeAction" }, "Failed to add employee");
    return { success: false, error: "Failed to add employee." };
  }
}

/** Update an employee's role. Only SUPER_ADMIN can do this. */
export async function updateEmployeeRoleAction(
  employeeId: string,
  newRole: string
): Promise<ActionResult> {
  const validRoles = ["manager", "trainer", "receptionist"];
  if (!validRoles.includes(newRole)) {
    return { success: false, error: "Invalid role." };
  }

  if (!employeeId) {
    return { success: false, error: "Employee ID is required." };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  // Only SUPER_ADMIN (owner) can modify employee roles
  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || membership.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only the owner can modify employee roles." };
  }

  try {
    const result = await updateEmployeeRole(
      ws.workspaceId,
      employeeId,
      newRole as "manager" | "trainer" | "receptionist"
    );

    if (!result) {
      return { success: false, error: "Employee not found." };
    }

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "EMPLOYEE_ROLE_UPDATED",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      details: { oldRole: result.oldRole, newRole },
    });

    revalidatePath("/app/employees");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "updateEmployeeRoleAction", employeeId }, "Failed to update employee role");
    return { success: false, error: "Failed to update role." };
  }
}
