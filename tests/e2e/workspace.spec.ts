import { test, expect } from "@playwright/test";

const TEST_USER = {
  name: "Workspace Test User",
  email: `e2e-ws-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

test.describe("Workspace Routing", () => {
  test.beforeEach(async ({ page }) => {
    // Sign up a fresh user for each test
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill(TEST_USER.name);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
  });

  test("should redirect authenticated user from /login to /workspaces", async ({
    page,
  }) => {
    // User is already signed up and authenticated from beforeEach
    await page.goto("/login");
    // Middleware should redirect authenticated user away from /login
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
  });

  test("should display empty workspace state for new user", async ({
    page,
  }) => {
    await page.goto("/workspaces");
    await expect(page).toHaveURL(/\/workspaces/);
    // New user has no workspaces, should see the empty state
    await expect(
      page.getByText("You don't belong to any workspace yet.")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should redirect to /workspaces when accessing /app/dashboard without workspace cookie", async ({
    page,
  }) => {
    // Clear the workspace cookie
    await page.context().clearCookies({
      name: "vajra_active_workspace",
    });
    await page.goto("/app/dashboard");
    // Should redirect because no workspace cookie is set
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
  });
});
