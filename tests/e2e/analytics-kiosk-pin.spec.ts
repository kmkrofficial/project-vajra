import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  addStaffToWorkspace,
  cleanupTestData,
  getTestDb,
  createTestUser,
  loginAndSelectWorkspace,
} from "./helpers";

// ─── Test Users ─────────────────────────────────────────────────────────────

const OWNER = {
  name: "Analytics Owner",
  email: `e2e-analytics-owner-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

const STAFF = {
  name: "Analytics Staff",
  email: `e2e-analytics-staff-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("Analytics & Settings", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    // Create users directly in DB (bypasses UI signup race condition)
    const ownerId = await createTestUser(OWNER);
    const staffUserId = await createTestUser(STAFF);

    // Seed workspace
    const seeded = await seedWorkspaceForUser(ownerId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Add staff
    await addStaffToWorkspace(workspaceId, branchId, staffUserId, "RECEPTIONIST");
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);

    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${OWNER.email}, ${STAFF.email})`;
    await sql.end();
  });

  // ─── Analytics RBAC ─────────────────────────────────────────────────────

  test("owner can access analytics page", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);

    // Navigate to analytics
    await page.goto("/app/analytics");
    await expect(page.getByTestId("analytics-page")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("analytics-kpis")).toBeVisible();
  });

  test("staff is redirected away from analytics page", async ({ page }) => {
    await loginAndSelectWorkspace(page, STAFF, expect);

    // Try to navigate to analytics
    await page.goto("/app/analytics");

    // Should be redirected to dashboard (not analytics)
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await expect(page.getByTestId("analytics-page")).not.toBeVisible();
  });

  // ─── Checkout Toggle in Settings ──────────────────────────────────────

  test("owner can toggle checkout setting from settings page", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);

    // Navigate to settings
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    // The checkout toggle section should be visible
    await expect(page.getByTestId("checkout-toggle-section")).toBeVisible();

    // Initially disabled (default) — button text should say "Disabled"
    const btn = page.getByTestId("checkout-toggle-btn");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText("Disabled");

    // Click to enable
    await btn.click();
    await expect(page.getByText("Check-out enabled")).toBeVisible({ timeout: 5_000 });
    await expect(btn).toHaveText("Enabled");

    // Click to disable again
    await btn.click();
    await expect(page.getByText("Check-out disabled")).toBeVisible({ timeout: 5_000 });
    await expect(btn).toHaveText("Disabled");
  });

  test("kiosk exit link returns to dashboard", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);

    // Navigate to kiosk
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    // Click the dashboard link (top-right)
    await page.getByTestId("kiosk-exit-btn").click();

    // Should navigate back to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });
});
