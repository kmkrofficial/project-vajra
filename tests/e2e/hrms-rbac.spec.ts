import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  cleanupTestData,
  getTestDb,
} from "./helpers";

// ─── Test Data ──────────────────────────────────────────────────────────────

const OWNER = {
  name: "HRMS RBAC Owner",
  email: `e2e-hrms-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;
let userId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("HRMS & RBAC", () => {
  test.beforeAll(async ({ browser }) => {
    // Sign up owner via UI
    const page = await browser.newPage();
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill(OWNER.name);
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/(verify-email|onboarding)/, { timeout: 10_000 });
    await page.close();

    // Get user ID and mark email as verified (skip OTP in test setup)
    const sql = getTestDb();
    const [row] = await sql`SELECT id FROM "user" WHERE email = ${OWNER.email}`;
    userId = row.id;
    await sql`UPDATE "user" SET email_verified = true WHERE id = ${userId}`;
    await sql.end();

    // Seed workspace
    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${OWNER.email}`;
    await sql.end();
  });

  // ── Helper ────────────────────────────────────────────────────────────

  async function loginAndSelectWorkspace(
    page: import("@playwright/test").Page
  ) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test("owner creates branch, invites employee, then edits role", async ({
    page,
  }) => {
    await loginAndSelectWorkspace(page);

    // ── Step 1: Create a new branch ──
    await page.goto("/app/branches");
    await expect(page).toHaveURL(/\/app\/branches/, { timeout: 5_000 });

    await page.getByTestId("create-branch-btn").click();
    await page.getByTestId("branch-name-input").fill("Downtown Branch");
    await page.getByTestId("branch-submit").click();

    // Verify the new branch appears
    await expect(page.getByText("Downtown Branch")).toBeVisible({
      timeout: 5_000,
    });

    // ── Step 2: Navigate to Employees and invite an employee ──
    await page.goto("/app/employees");
    await expect(page).toHaveURL(/\/app\/employees/, { timeout: 5_000 });

    await page.getByTestId("invite-employee-btn").click();

    // Fill in the employee form (now requires email)
    await page.getByTestId("emp-name-input").fill("Alice Trainer");
    await page.getByTestId("emp-email-input").fill(`e2e-alice-${Date.now()}@test.local`);

    // Select role: receptionist
    await page.getByTestId("emp-role-select").click();
    await page.getByText("Receptionist", { exact: true }).click();

    // Select branch: Downtown Branch
    await page.getByTestId("emp-branch-select").click();
    await page.getByText("Downtown Branch").click();

    // Submit
    await page.getByTestId("emp-submit").click();

    // Verify success toast
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5_000,
    });

    // Verify the employee appears in the list
    await expect(page.getByText("Alice Trainer")).toBeVisible({
      timeout: 5_000,
    });

    // ── Step 3: Edit the employee role via Edit dialog ──
    const empRow = page.locator(`[data-testid^="employee-row-"]`).filter({
      hasText: "Alice Trainer",
    });
    await expect(empRow).toBeVisible();

    await empRow.locator("[data-testid^='edit-employee-']").click();

    // Change role to Manager
    await page.getByTestId("edit-role-select").click();
    await page.getByText("Manager", { exact: true }).click();

    await page.getByTestId("edit-submit").click();

    // Verify success toast for update
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /updated/i })
    ).toBeVisible({ timeout: 5_000 });

    // Verify the role was updated in the DB
    const sql = getTestDb();
    const [emp] = await sql`
      SELECT role FROM employees
      WHERE workspace_id = ${workspaceId} AND name = 'Alice Trainer'
    `;
    expect(emp.role).toBe("manager");
    await sql.end();
  });
});
