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
  name: "Intelligence Owner",
  email: `e2e-intel-owner-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

const RECEPTIONIST = {
  name: "Intelligence Staff",
  email: `e2e-intel-staff-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;
let ownerId: string;
let receptionistId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("Owner Intelligence", () => {
  test.beforeAll(async () => {
    // Create users directly in DB (bypasses UI signup race condition)
    ownerId = await createTestUser(OWNER);
    receptionistId = await createTestUser(RECEPTIONIST);

    // Seed workspace + assign owner
    const seeded = await seedWorkspaceForUser(ownerId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Add receptionist as staff
    await addStaffToWorkspace(workspaceId, branchId, receptionistId, "RECEPTIONIST");

    // Seed an audit log entry so the audit logs page has data
    const sql2 = getTestDb();
    await sql2`
      INSERT INTO audit_logs (workspace_id, user_id, action, entity_type, entity_id, details)
      VALUES (${workspaceId}, ${ownerId}, 'ADD_MEMBER', 'MEMBER', 'test-entity-123',
              '{"name": "Seeded Member"}')
    `;
    await sql2.end();
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${OWNER.email}, ${RECEPTIONIST.email})`;
    await sql.end();
  });

  // ── Helpers ───────────────────────────────────────────────────────────

  async function loginAndSelectWorkspace(
    page: import("@playwright/test").Page,
    user: { email: string; password: string }
  ) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test("receptionist is blocked from analytics", async ({ page }) => {
    await loginAndSelectWorkspace(page, RECEPTIONIST);

    // Try to access analytics directly
    await page.goto("/app/analytics");

    // Should be redirected to dashboard (RBAC block)
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Analytics page should NOT be visible
    await expect(page.getByTestId("analytics-page")).not.toBeVisible();
  });

  test("owner can view analytics KPI cards", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER);

    // Navigate to analytics
    await page.goto("/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics/, { timeout: 5_000 });

    // The analytics page should render without errors
    await expect(page.getByTestId("analytics-page")).toBeVisible({
      timeout: 5_000,
    });

    // KPI cards container should be visible
    await expect(page.getByTestId("analytics-kpis")).toBeVisible();

    // Verify at least the Revenue and Members titles exist
    await expect(page.getByText("Monthly Revenue")).toBeVisible();
    await expect(page.getByText("Active Members")).toBeVisible();
  });

  test("owner can view audit logs with seeded data", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER);

    // Navigate to audit logs
    await page.goto("/app/audit-logs");
    await expect(page).toHaveURL(/\/app\/audit-logs/, { timeout: 5_000 });

    // The audit logs page should render
    await expect(page.getByTestId("audit-logs-page")).toBeVisible({
      timeout: 5_000,
    });

    // The table should contain the seeded audit log entry
    await expect(page.getByText("ADD_MEMBER")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("cell", { name: /^MEMBER/ })).toBeVisible();

    // Filter should be present
    await expect(page.getByTestId("audit-filter")).toBeVisible();

    // Test filtering — type a filter and verify it narrows results
    await page.getByTestId("audit-filter").fill("ADD_MEMBER");
    await expect(page.getByText("ADD_MEMBER")).toBeVisible();
  });

  test("receptionist is blocked from audit logs", async ({ page }) => {
    await loginAndSelectWorkspace(page, RECEPTIONIST);

    // Try to access audit logs directly
    await page.goto("/app/audit-logs");

    // Should be redirected to dashboard (RBAC block - SUPER_ADMIN only)
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await expect(page.getByTestId("audit-logs-page")).not.toBeVisible();
  });

  // ── Additional Edge Cases ─────────────────────────────────────────────

  test("audit log table has correct columns", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER);
    await page.goto("/app/audit-logs");
    await expect(page.getByTestId("audit-logs-page")).toBeVisible({ timeout: 5_000 });

    // Verify the seeded entry has the expected entity type
    await expect(page.getByRole("cell", { name: /^MEMBER/ })).toBeVisible();
    await expect(page.getByText("ADD_MEMBER")).toBeVisible();
  });

  test("analytics page shows KPI card structure", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER);
    await page.goto("/app/analytics");
    await expect(page.getByTestId("analytics-page")).toBeVisible({ timeout: 5_000 });

    // Verify specific KPI titles
    await expect(page.getByText("Monthly Revenue")).toBeVisible();
    await expect(page.getByText("Active Members")).toBeVisible();
  });

  test("audit log filter narrows results", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER);
    await page.goto("/app/audit-logs");
    await expect(page.getByTestId("audit-logs-page")).toBeVisible({ timeout: 5_000 });

    // Filter by action
    await page.getByTestId("audit-filter").fill("ADD_MEMBER");
    await expect(page.getByText("ADD_MEMBER")).toBeVisible();

    // Filter by something that doesn't exist
    await page.getByTestId("audit-filter").fill("NONEXISTENT_ACTION");
    // After filtering, the seeded entry should not match
    // The table should either show no results or an empty state
    await expect(page.getByText("ADD_MEMBER")).not.toBeVisible({ timeout: 3_000 });
  });
});
