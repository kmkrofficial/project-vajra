import { test, expect } from "@playwright/test";
import { seedGymForUser, cleanupTestData, getTestDb, createTestUser } from "./helpers";

const TEST_USER = {
  name: "Routing Test User",
  email: `e2e-routing-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let userId: string;
let gymId: string;

test.describe("Auth Routing", () => {
  test.beforeAll(async () => {
    // Create user directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(TEST_USER);

    const seeded = await seedGymForUser(userId);
    gymId = seeded.gymId;
  });

  test.afterAll(async () => {
    if (gymId) await cleanupTestData(gymId);
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
    // User with a gym auto-redirects to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test("authenticated user with gym auto-redirects to dashboard", async ({
    page,
  }) => {
    await loginAs(page);

    // Verify we landed on dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test("should redirect authenticated user from /login to dashboard", async ({
    page,
  }) => {
    await loginAs(page);

    // Now revisit /login — middleware should redirect away from login
    await page.goto("/login");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test("TopBar shows branch name", async ({
    page,
  }) => {
    await loginAs(page);
    // Branch name should be visible in the top bar
    await expect(page.getByTestId("topbar-branch-name")).toBeVisible({ timeout: 5_000 });
  });

  test("dashboard is accessible after login", async ({
    page,
  }) => {
    await loginAs(page);

    // Visit dashboard directly — should work
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5_000 });
  });

  test("unauthenticated user redirected to /login from protected route", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("authenticated user can access /app/dashboard directly", async ({
    page,
  }) => {
    await loginAs(page);

    // Now visit dashboard directly — should work
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5_000 });
  });
});
