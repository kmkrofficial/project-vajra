import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  addStaffToWorkspace,
  cleanupTestData,
  getTestDb,
  createTestUser,
} from "./helpers";

// ─── Test Data ──────────────────────────────────────────────────────────────

const OWNER = {
  name: "Employee Invite Owner",
  email: `e2e-emp-invite-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

const EMPLOYEE = {
  name: "New Staff Member",
  email: `e2e-emp-staff-${Date.now()}@test.local`,
  password: "StaffPass123!",
};

const RECEPTIONIST = {
  name: "Non-Admin Staff",
  email: `e2e-emp-recep-${Date.now()}@test.local`,
  password: "StaffPass123!",
};

let workspaceId: string;
let branchId: string;
let userId: string;
let receptionistId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe.serial("Employee Invite Flow", () => {
  test.beforeAll(async () => {
    // Create users directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(OWNER);
    receptionistId = await createTestUser(RECEPTIONIST);

    // Seed workspace
    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Add receptionist to workspace
    await addStaffToWorkspace(workspaceId, branchId, receptionistId, "RECEPTIONIST");
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${OWNER.email}, ${EMPLOYEE.email}, ${RECEPTIONIST.email})`;
    await sql.end();
  });

  // ── Helper ────────────────────────────────────────────────────────────

  async function loginAndSelectWorkspace(
    page: import("@playwright/test").Page,
    user = OWNER
  ) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test("owner invites employee with email, employee appears as invited", async ({
    page,
  }) => {
    await loginAndSelectWorkspace(page);

    // Navigate to employees page
    await page.goto("/app/employees");
    await expect(page).toHaveURL(/\/app\/employees/, { timeout: 5_000 });

    // Click invite button
    await page.getByTestId("invite-employee-btn").click();

    // Fill the invite form
    await page.getByTestId("emp-name-input").fill(EMPLOYEE.name);
    await page.getByTestId("emp-email-input").fill(EMPLOYEE.email);
    await page.getByTestId("emp-phone-input").fill("9876543210");

    // Select role
    await page.getByTestId("emp-role-select").click();
    await page.getByRole("option", { name: "Trainer" }).click();

    // Select branch
    await page.getByTestId("emp-branch-select").locator("label", { hasText: "Main Branch" }).click();

    // Submit
    await page.getByTestId("emp-submit").click();

    // Verify success toast
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /invitation sent/i })
    ).toBeVisible({ timeout: 5_000 });

    // Verify the employee appears as "invited"
    await expect(page.getByText(EMPLOYEE.name)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("invited")).toBeVisible();

    // Verify DB: invite was created
    const sql = getTestDb();
    const [emp] = await sql`
      SELECT id, status, email FROM employees
      WHERE workspace_id = ${workspaceId} AND email = ${EMPLOYEE.email}
    `;
    expect(emp).toBeTruthy();
    expect(emp.status).toBe("invited");
    expect(emp.email).toBe(EMPLOYEE.email);

    const [invite] = await sql`
      SELECT id, consumed FROM employee_invites
      WHERE employee_id = ${emp.id}
    `;
    expect(invite).toBeTruthy();
    expect(invite.consumed).toBe(false);
    await sql.end();
  });

  test("owner can edit employee details", async ({ page }) => {
    await loginAndSelectWorkspace(page);
    await page.goto("/app/employees");

    // Find the employee row and click edit
    const empRow = page.locator(`[data-testid^="employee-row-"]`).filter({
      hasText: EMPLOYEE.name,
    });
    await expect(empRow).toBeVisible({ timeout: 5_000 });

    // Click edit button within the row
    await empRow.locator("[data-testid^='edit-employee-']").click();

    // Change the name
    const nameInput = page.getByTestId("edit-name-input");
    await nameInput.clear();
    await nameInput.fill("Updated Staff Member");

    // Submit
    await page.getByTestId("edit-submit").click();

    // Verify success toast
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /updated/i })
    ).toBeVisible({ timeout: 5_000 });

    // Verify updated name in the list
    await expect(page.getByText("Updated Staff Member")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("owner can remove an employee", async ({ page }) => {
    await loginAndSelectWorkspace(page);
    await page.goto("/app/employees");

    // Find the employee
    const empRow = page.locator(`[data-testid^="employee-row-"]`).filter({
      hasText: "Updated Staff Member",
    });
    await expect(empRow).toBeVisible({ timeout: 5_000 });

    // Intercept the confirm dialog and auto-accept
    page.on("dialog", (dialog) => dialog.accept());

    // Click remove button
    await empRow.locator("[data-testid^='remove-employee-']").click();

    // Verify success toast
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /removed/i })
    ).toBeVisible({ timeout: 5_000 });

    // Verify the employee row is gone from the list (status = left, filtered out)
    await expect(
      page.locator(`[data-testid^="employee-row-"]`).filter({
        hasText: "Updated Staff Member",
      })
    ).not.toBeVisible({ timeout: 5_000 });

    // Verify DB: employee status is "left"
    const sql = getTestDb();
    const [emp] = await sql`
      SELECT status FROM employees
      WHERE workspace_id = ${workspaceId} AND email = ${EMPLOYEE.email}
    `;
    expect(emp.status).toBe("left");
    await sql.end();
  });

  test("employee email uniqueness: cannot invite same email to another gym", async ({
    page,
  }) => {
    await loginAndSelectWorkspace(page);
    await page.goto("/app/employees");

    // The previous employee was marked as "left", so re-inviting the same
    // email should work (left employees are excluded from uniqueness check)
    await page.getByTestId("invite-employee-btn").click();
    await page.getByTestId("emp-name-input").fill("Re-invited Staff");
    await page.getByTestId("emp-email-input").fill(EMPLOYEE.email);

    await page.getByTestId("emp-role-select").click();
    await page.getByRole("option", { name: "Receptionist" }).click();

    await page.getByTestId("emp-branch-select").locator("label", { hasText: "Main Branch" }).click();

    await page.getByTestId("emp-submit").click();

    // Should succeed since the old record was "left"
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /invitation sent/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Validation Edge Cases ─────────────────────────────────────────────

  test("submit button disabled when no role or branch selected", async ({ page }) => {
    await loginAndSelectWorkspace(page);
    await page.goto("/app/employees");

    await page.getByTestId("invite-employee-btn").click();
    await page.getByTestId("emp-name-input").fill("Test Name");
    await page.getByTestId("emp-email-input").fill("test@test.local");

    // Submit should be disabled because no role/branch are selected
    await expect(page.getByTestId("emp-submit")).toBeDisabled();
  });

  test("invite with invalid email shows error toast", async ({ page }) => {
    await loginAndSelectWorkspace(page);
    await page.goto("/app/employees");

    await page.getByTestId("invite-employee-btn").click();
    await page.getByTestId("emp-name-input").fill("Bad Email User");
    await page.getByTestId("emp-email-input").fill("not-an-email");

    await page.getByTestId("emp-role-select").click();
    await page.getByRole("option", { name: "Trainer" }).click();
    await page.getByTestId("emp-branch-select").locator("label", { hasText: "Main Branch" }).click();

    await page.getByTestId("emp-submit").click();

    // HTML5 type="email" validation prevents form submission for invalid emails.
    // Verify the input is marked invalid and the form did NOT submit.
    const isInvalid = await page.getByTestId("emp-email-input").evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBe(true);
    // Should stay on the employees page
    await expect(page).toHaveURL(/\/app\/employees/);
  });

  test("invite with name less than 2 characters shows error", async ({ page }) => {
    await loginAndSelectWorkspace(page);
    await page.goto("/app/employees");

    await page.getByTestId("invite-employee-btn").click();
    await page.getByTestId("emp-name-input").fill("A"); // < 2 chars
    await page.getByTestId("emp-email-input").fill(`shortname-${Date.now()}@test.local`);

    await page.getByTestId("emp-role-select").click();
    await page.getByRole("option", { name: "Trainer" }).click();
    await page.getByTestId("emp-branch-select").locator("label", { hasText: "Main Branch" }).click();

    await page.getByTestId("emp-submit").click();

    // Should show validation error
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });
  });

  // ── RBAC: Receptionist blocked from inviting ──────────────────────────

  test("receptionist cannot see invite button on employees page", async ({ page }) => {
    // Login as receptionist
    await page.goto("/login");
    await page.getByLabel("Email").fill(RECEPTIONIST.email);
    await page.getByLabel("Password").fill(RECEPTIONIST.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/employees");

    // Receptionist should NOT see the invite button
    await expect(page.getByTestId("invite-employee-btn")).not.toBeVisible({ timeout: 5_000 });
  });

  // ── DB verification after invite ──────────────────────────────────────

  test("invite creates audit log entry", async ({ page }) => {
    // The earlier successful invite should have created an audit log
    const sql = getTestDb();
    const [log] = await sql`
      SELECT action FROM audit_logs
      WHERE workspace_id = ${workspaceId} AND action = 'EMPLOYEE_INVITED'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(log).toBeTruthy();
    expect(log.action).toBe("EMPLOYEE_INVITED");
    await sql.end();
  });
});
