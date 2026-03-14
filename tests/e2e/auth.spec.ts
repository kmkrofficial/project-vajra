import { test, expect } from "@playwright/test";

const TEST_USER = {
  name: "Test User",
  email: `e2e-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

test.describe("Authentication Flow", () => {
  test("should sign up a new user and redirect to /onboarding", async ({
    page,
  }) => {
    await page.goto("/signup");

    await page.getByLabel("Full Name").fill(TEST_USER.name);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();

    // After successful signup, user should be redirected to /onboarding
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
  });

  test("should sign in an existing user and redirect to /dashboard", async ({
    page,
  }) => {
    // First sign up to ensure the user exists
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill(TEST_USER.name);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });

    // Now sign out (navigate directly to login)
    await page.goto("/login");

    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // After successful login, should redirect to /dashboard or /workspaces
    await expect(page).toHaveURL(/\/(dashboard|workspaces)/, {
      timeout: 10_000,
    });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("nonexistent@test.local");
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should see an error toast and stay on /login
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });
});
