import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  addStaffToWorkspace,
  cleanupTestData,
  getTestDb,
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

test.describe("Analytics & Kiosk PIN", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async ({ browser }) => {
    // Sign up the owner
    const ownerPage = await browser.newPage();
    await ownerPage.goto("/signup");
    await ownerPage.getByLabel("Full Name").fill(OWNER.name);
    await ownerPage.getByLabel("Email").fill(OWNER.email);
    await ownerPage.getByLabel("Password").fill(OWNER.password);
    await ownerPage.getByRole("button", { name: "Sign Up" }).click();
    await expect(ownerPage).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await ownerPage.close();

    // Sign up the staff
    const staffPage = await browser.newPage();
    await staffPage.goto("/signup");
    await staffPage.getByLabel("Full Name").fill(STAFF.name);
    await staffPage.getByLabel("Email").fill(STAFF.email);
    await staffPage.getByLabel("Password").fill(STAFF.password);
    await staffPage.getByRole("button", { name: "Sign Up" }).click();
    await expect(staffPage).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await staffPage.close();

    // Get user IDs
    const sql = getTestDb();
    const [ownerRow] = await sql`SELECT id FROM "user" WHERE email = ${OWNER.email}`;
    const [staffRow] = await sql`SELECT id FROM "user" WHERE email = ${STAFF.email}`;
    await sql.end();

    // Seed workspace
    const seeded = await seedWorkspaceForUser(ownerRow.id);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Add staff
    await addStaffToWorkspace(workspaceId, branchId, staffRow.id, "RECEPTIONIST");
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);

    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${OWNER.email}, ${STAFF.email})`;
    await sql.end();
  });

  // ─── Analytics RBAC ─────────────────────────────────────────────────────

  test("owner can access analytics page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Navigate to analytics
    await page.goto("/app/analytics");
    await expect(page.getByTestId("analytics-page")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("analytics-kpis")).toBeVisible();
  });

  test("staff is redirected away from analytics page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STAFF.email);
    await page.getByLabel("Password").fill(STAFF.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Try to navigate to analytics
    await page.goto("/app/analytics");

    // Should be redirected to dashboard (not analytics)
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await expect(page.getByTestId("analytics-page")).not.toBeVisible();
  });

  // ─── Kiosk PIN Setup ───────────────────────────────────────────────────

  test("owner can set kiosk PIN from settings", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Navigate to kiosk settings
    await page.goto("/app/settings/kiosk");

    // Fill in and save a PIN
    await page.getByTestId("kiosk-pin-input").fill("1234");
    await page.getByTestId("kiosk-pin-confirm").fill("1234");
    await page.getByTestId("kiosk-pin-save").click();

    // Should see success toast
    await expect(page.getByText("Kiosk exit PIN saved!")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("kiosk exit uses the stored PIN", async ({ page }) => {
    // First log in and navigate to set context
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Navigate to kiosk
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    // Click the hidden exit button
    await page.getByTestId("kiosk-exit-btn").click({ force: true });

    // Enter wrong PIN
    await page.getByTestId("kiosk-exit-input").fill("9999");
    await page.getByTestId("kiosk-exit-submit").click();

    // Should show error
    await expect(page.getByText("Incorrect PIN")).toBeVisible({ timeout: 5_000 });

    // Enter correct PIN (set as "1234" in previous test)
    await page.getByTestId("kiosk-exit-input").fill("1234");
    await page.getByTestId("kiosk-exit-submit").click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });
});
