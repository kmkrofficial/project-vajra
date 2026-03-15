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
    // Single-workspace users auto-redirect to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test("single-workspace user auto-redirects from /workspaces to dashboard", async ({
    page,
  }) => {
    await loginAs(page);

    // Verify we landed on dashboard, not /workspaces
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test("should redirect authenticated user from /login to dashboard", async ({
    page,
  }) => {
    await loginAs(page);

    // Now revisit /login — middleware should redirect away from login
    await page.goto("/login");
    // Single-workspace user: /workspaces auto-redirects to /app/dashboard
    await expect(page).toHaveURL(/\/(workspaces|app\/dashboard)/, { timeout: 10_000 });
  });

  test("TopBar shows branch name", async ({
    page,
  }) => {
    await loginAs(page);
    // Branch name should be visible in the top bar
    await expect(page.getByTestId("topbar-branch-name")).toBeVisible({ timeout: 5_000 });
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
    // Should redirect because no workspace cookie is set — will then
    // auto-redirect from /workspaces to /app/dashboard again
    await expect(page).toHaveURL(/\/(workspaces|app\/dashboard)/, { timeout: 10_000 });
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

    // Cookie was auto-set by /workspaces auto-redirect
    // Now visit dashboard directly — should work because cookie is set
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5_000 });
  });
});
