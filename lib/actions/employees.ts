"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import {
  insertEmployee,
  updateEmployeeRole,
  updateEmployee,
  removeEmployee,
  employeeLeave,
  getEmployeeById,
  isEmployeeEmailTaken,
  createEmployeeInvite,
  findPendingInvite,
  findPendingInviteByEmail,
  acceptEmployeeInvite,
} from "@/lib/dal/employees";
import { insertAuditLog } from "@/lib/dal/audit";
import { generateOtp, hashOtp, inviteExpiresAt, verifyOtp } from "@/lib/services/otp";
import { sendEmail } from "@/lib/services/email";
import { employeeInviteSchema, employeeEditSchema, otpSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

type ActionResult = { success: boolean; error?: string };

const ADMIN_ROLES = ["SUPER_ADMIN", "MANAGER"];

/**
 * Invite a new employee. Creates the employee record, generates an OTP,
 * and sends an invite email. Only SUPER_ADMIN and MANAGER can do this.
 */
export async function inviteEmployeeAction(data: {
  name: string;
  email: string;
  phone?: string;
  role: string;
  branchId: string;
}): Promise<ActionResult> {
  const parsed = employeeInviteSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return { success: false, error: "Only admins can invite employees." };
  }

  const email = parsed.data.email.toLowerCase();

  // Check if email is already in use by an active/invited employee in any workspace
  const existing = await isEmployeeEmailTaken(email);
  if (existing) {
    return {
      success: false,
      error: "This email is already associated with an employee at another gym.",
    };
  }

  try {
    // Create employee record
    const employee = await insertEmployee({
      workspaceId: ws.workspaceId,
      branchId: parsed.data.branchId,
      name: parsed.data.name.trim(),
      email,
      phone: parsed.data.phone?.trim() || null,
      role: parsed.data.role as "manager" | "trainer" | "receptionist",
      status: "invited",
    });

    // Generate OTP and create invite
    const otp = generateOtp();
    const hashed = hashOtp(otp);

    await createEmployeeInvite({
      employeeId: employee.id,
      workspaceId: ws.workspaceId,
      email,
      otpHash: hashed,
      expiresAt: inviteExpiresAt(),
    });

    // Send invite email
    await sendEmail({
      to: email,
      subject: `You're invited to join as ${parsed.data.role} — Vajra Gym`,
      text: [
        `Hi ${parsed.data.name},`,
        ``,
        `You've been invited to join as a ${parsed.data.role}.`,
        ``,
        `Your one-time verification code is: ${otp}`,
        ``,
        `To accept the invitation:`,
        `1. Sign up or log in at the gym platform`,
        `2. Go to the invite acceptance page`,
        `3. Enter your email and the verification code above`,
        ``,
        `This code expires in 24 hours.`,
        ``,
        `— Vajra Gym Platform`,
      ].join("\n"),
      html: `
        <h2>You're Invited!</h2>
        <p>Hi ${parsed.data.name},</p>
        <p>You've been invited to join as a <strong>${parsed.data.role}</strong>.</p>
        <p>Your one-time verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 16px; background: #f4f4f5; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p>This code expires in 24 hours.</p>
        <p>To accept, sign up or log in, then enter your email and this code on the invite acceptance page.</p>
      `,
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "EMPLOYEE_INVITED",
      entityType: "EMPLOYEE",
      entityId: employee.id,
      details: { name: data.name, email, role: data.role, branchId: data.branchId },
    });

    revalidatePath("/app/employees");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "inviteEmployeeAction" }, "Failed to invite employee");
    return { success: false, error: "Failed to invite employee." };
  }
}

/**
 * Resend the invite OTP for an existing invited employee.
 * Only SUPER_ADMIN and MANAGER can do this.
 */
export async function resendInviteAction(employeeId: string): Promise<ActionResult> {
  if (!employeeId) return { success: false, error: "Employee ID required." };

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return { success: false, error: "Only admins can resend invites." };
  }

  try {
    const emp = await getEmployeeById(ws.workspaceId, employeeId);
    if (!emp) return { success: false, error: "Employee not found." };
    if (emp.status !== "invited") return { success: false, error: "Employee is already active." };

    const otp = generateOtp();
    const hashed = hashOtp(otp);

    await createEmployeeInvite({
      employeeId,
      workspaceId: ws.workspaceId,
      email: emp.email,
      otpHash: hashed,
      expiresAt: inviteExpiresAt(),
    });

    await sendEmail({
      to: emp.email,
      subject: `Invitation reminder — Vajra Gym`,
      text: [
        `Hi ${emp.name},`,
        ``,
        `This is a reminder of your pending invitation.`,
        `Your new verification code is: ${otp}`,
        ``,
        `This code expires in 24 hours.`,
        ``,
        `— Vajra Gym Platform`,
      ].join("\n"),
    });

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "resendInviteAction", employeeId }, "Failed to resend invite");
    return { success: false, error: "Failed to resend invite." };
  }
}

/**
 * Accept an employee invitation. The current authenticated user provides
 * the email & OTP. If valid, they are linked to the employee and workspace.
 */
export async function acceptInviteAction(data: {
  email: string;
  otp: string;
}): Promise<ActionResult> {
  const otpParsed = otpSchema.safeParse(data.otp);
  if (!otpParsed.success) return { success: false, error: "OTP must be 6 digits." };

  if (!data.email) return { success: false, error: "Email is required." };

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated. Please sign up or log in first." };

  const email = data.email.toLowerCase();

  try {
    // Find pending invite by email
    const invite = await findPendingInviteByEmail(email);
    if (!invite) {
      return { success: false, error: "No pending invitation found for this email, or it has expired." };
    }

    // Verify OTP
    if (!verifyOtp(data.otp, invite.otpHash)) {
      return { success: false, error: "Invalid verification code." };
    }

    // Check user isn't already in another workspace as employee
    // (The isEmployeeEmailTaken check was done at invite time,
    // but the user might have joined another gym since then.)
    // We allow it if the session user's email matches the invite email.
    if (session.user.email?.toLowerCase() !== email) {
      return {
        success: false,
        error: "The logged in account email does not match the invitation email. Please log in with the correct account.",
      };
    }

    // Accept the invite
    await acceptEmployeeInvite(
      invite.id,
      invite.employeeId,
      invite.workspaceId,
      session.user.id
    );

    await insertAuditLog({
      workspaceId: invite.workspaceId,
      userId: session.user.id,
      action: "EMPLOYEE_INVITE_ACCEPTED",
      entityType: "EMPLOYEE",
      entityId: invite.employeeId,
      details: { email },
    });

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "acceptInviteAction", email }, "Failed to accept invite");
    return { success: false, error: "Failed to accept invitation." };
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

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return { success: false, error: "Only admins can modify employee roles." };
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

/** Edit an employee's details (name, email, phone, role, branch). Only SUPER_ADMIN/MANAGER. */
export async function editEmployeeAction(
  employeeId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    branchId: string;
  }
): Promise<ActionResult> {
  const parsed = employeeEditSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: firstError };
  }

  if (!employeeId) return { success: false, error: "Employee ID required." };

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return { success: false, error: "Only admins can edit employees." };
  }

  const email = parsed.data.email.toLowerCase();

  // Check email uniqueness (exclude current employee)
  const emailConflict = await isEmployeeEmailTaken(email, employeeId);
  if (emailConflict) {
    return { success: false, error: "This email is already associated with another employee." };
  }

  try {
    const updated = await updateEmployee(ws.workspaceId, employeeId, {
      name: parsed.data.name.trim(),
      email,
      phone: parsed.data.phone?.trim() || null,
      role: parsed.data.role as "manager" | "trainer" | "receptionist",
      branchId: parsed.data.branchId,
    });

    if (!updated) return { success: false, error: "Employee not found." };

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "EMPLOYEE_UPDATED",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      details: { name: parsed.data.name, email, role: parsed.data.role },
    });

    revalidatePath("/app/employees");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "editEmployeeAction", employeeId }, "Failed to edit employee");
    return { success: false, error: "Failed to update employee." };
  }
}

/** Remove an employee. Only SUPER_ADMIN/MANAGER can do this. */
export async function removeEmployeeAction(employeeId: string): Promise<ActionResult> {
  if (!employeeId) return { success: false, error: "Employee ID required." };

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return { success: false, error: "Only admins can remove employees." };
  }

  try {
    const emp = await getEmployeeById(ws.workspaceId, employeeId);
    if (!emp) return { success: false, error: "Employee not found." };

    const result = await removeEmployee(ws.workspaceId, employeeId);
    if (!result) return { success: false, error: "Employee not found." };

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "EMPLOYEE_REMOVED",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      details: { name: emp.name, email: emp.email },
    });

    revalidatePath("/app/employees");
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "removeEmployeeAction", employeeId }, "Failed to remove employee");
    return { success: false, error: "Failed to remove employee." };
  }
}

/** Employee voluntarily leaves the gym. Any authenticated employee can call this for themselves. */
export async function leaveGymAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  // Don't let SUPER_ADMIN (owner) leave their own gym
  const membership = await verifyWorkspaceMembership(ws.workspaceId, session.user.id);
  if (!membership) return { success: false, error: "Not a member of this workspace." };
  if (membership.role === "SUPER_ADMIN") {
    return { success: false, error: "The gym owner cannot leave. Transfer ownership first." };
  }

  try {
    const result = await employeeLeave(ws.workspaceId, session.user.id);
    if (!result) return { success: false, error: "Employee record not found." };

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "EMPLOYEE_LEFT",
      entityType: "EMPLOYEE",
      entityId: session.user.id,
      details: { voluntary: true },
    });

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "leaveGymAction" }, "Failed to leave gym");
    return { success: false, error: "Failed to leave the gym." };
  }
}
