import { test, expect } from "@playwright/test";
import { seedWorkspaceForUser, cleanupTestData, getTestDb } from "./helpers";

const TEST_USER = {
  name: "Workspace Test User",
  email: `e2e-ws-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let userId: string;
let workspaceId: string;

test.describe("Workspace Routing", () => {
  test.beforeAll(async ({ browser }) => {
    // Sign up a user to use across all tests
    const page = await browser.newPage();
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill(TEST_USER.name);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/(verify-email|onboarding)/, { timeout: 10_000 });
    await page.close();

    // Get user ID, mark email verified, seed workspace
    const sql = getTestDb();
    const [row] = await sql`SELECT id FROM "user" WHERE email = ${TEST_USER.email}`;
    userId = row.id;
    await sql`UPDATE "user" SET email_verified = true WHERE id = ${userId}`;
    await sql.end();

    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${TEST_USER.email}`;
    await sql.end();
  });

  test("should redirect authenticated user from /login to /workspaces", async ({
    page,
  }) => {
    // Log in to get an auth cookie
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    // Now revisit /login — middleware should redirect to /workspaces
    await page.goto("/login");
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
  });

  test("should display workspace list for user with a workspace", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    // User has a workspace, should see the workspace card
    await expect(
      page.locator("[data-testid^='workspace-card-']").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should redirect to /workspaces when accessing /app/dashboard without workspace cookie", async ({
    page,
  }) => {
    // Log in first
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    // Clear the workspace cookie only
    await page.context().clearCookies({
      name: "vajra_active_workspace",
    });
    await page.goto("/app/dashboard");
    // Should redirect because no workspace cookie is set
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
  });
});
