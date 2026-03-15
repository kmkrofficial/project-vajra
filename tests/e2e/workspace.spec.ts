import { test, expect } from "@playwright/test";
import { seedWorkspaceForUser, cleanupTestData, getTestDb, createTestUser } from "./helpers";

const TEST_USER = {
  name: "Workspace Test User",
  email: `e2e-ws-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let userId: string;
let workspaceId: string;

test.describe("Workspace Routing", () => {
  test.beforeAll(async () => {
    // Create user directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(TEST_USER);

    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${TEST_USER.email}`;
    await sql.end();
  });

  // ── Helper ────────────────────────────────────────────────────────────

  async function loginAs(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test("should redirect authenticated user from /login to /workspaces", async ({
    page,
  }) => {
    await loginAs(page);

    // Now revisit /login — middleware should redirect to /workspaces
    await page.goto("/login");
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
  });

  test("should display workspace list for user with a workspace", async ({
    page,
  }) => {
    await loginAs(page);

    // User has a workspace, should see the workspace card
    await expect(
      page.locator("[data-testid^='workspace-card-']").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should redirect to /workspaces when accessing /app/dashboard without workspace cookie", async ({
    page,
  }) => {
    await loginAs(page);

    // Clear the workspace cookie only
    await page.context().clearCookies({
      name: "vajra_active_workspace",
    });
    await page.goto("/app/dashboard");
    // Should redirect because no workspace cookie is set
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
  });

  test("clicking workspace card navigates to dashboard", async ({ page }) => {
    await loginAs(page);

    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test("workspace card displays gym name", async ({ page }) => {
    await loginAs(page);

    const card = page.locator("[data-testid^='workspace-card-']").first();
    await expect(card).toBeVisible({ timeout: 5_000 });
    // Should show the workspace name from seed data
    await expect(card.getByText("Test Gym")).toBeVisible();
  });

  test("unauthenticated user redirected from /workspaces to /login", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/workspaces");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("authenticated user with workspace cookie can access /app/dashboard directly", async ({
    page,
  }) => {
    await loginAs(page);

    // Select workspace to set cookie
    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Now visit dashboard directly — should work because cookie is set
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5_000 });
  });
});
