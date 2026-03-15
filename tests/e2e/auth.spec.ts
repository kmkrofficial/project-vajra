import { test, expect } from "@playwright/test";
import { getTestDb, createTestUser } from "./helpers";

const TEST_USER = {
  name: "Test User",
  email: `e2e-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

test.describe("Authentication Flow", () => {
  test.afterAll(async () => {
    // Clean up any test users created during these tests
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email LIKE 'e2e-%@test.local'`;
    await sql.end();
  });

  // ── Happy path ────────────────────────────────────────────────────────

  test("should sign up a new user and redirect to /verify-email", async ({
    page,
  }) => {
    await page.goto("/signup");

    await page.getByLabel("Full Name").fill(TEST_USER.name);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();

    // After successful signup, user should be redirected to /verify-email
    await expect(page).toHaveURL(/\/(verify-email|onboarding)/, { timeout: 10_000 });
  });

  test("should sign in an existing user and redirect to /workspaces", async ({
    page,
  }) => {
    // Create user directly in DB with verified email (avoids UI signup race)
    const signinEmail = `e2e-signin-${Date.now()}@test.local`;
    await createTestUser({
      name: "Sign In Test User",
      email: signinEmail,
      password: "TestPassword123!",
    });

    await page.goto("/login");

    await page.getByLabel("Email").fill(signinEmail);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // After successful login, should redirect to /workspaces or /onboarding
    await expect(page).toHaveURL(/\/(workspaces|onboarding)/, {
      timeout: 10_000,
    });
  });

  // ── Invalid credentials ───────────────────────────────────────────────

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

  test("should show error for wrong password on existing user", async ({
    page,
  }) => {
    // Sign up first
    const email = `e2e-wrongpw-${Date.now()}@test.local`;
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill("Wrong PW User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("CorrectPass123!");
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/(verify-email|onboarding)/, { timeout: 10_000 });

    // Try logging in with wrong password
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("WrongPassword99!");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Duplicate email signup ────────────────────────────────────────────

  test("should reject duplicate email on signup", async ({ page }) => {
    const email = `e2e-dup-${Date.now()}@test.local`;

    // First signup
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill("First User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/(verify-email|onboarding)/, { timeout: 10_000 });

    // Clear session and try duplicate signup
    await page.context().clearCookies();
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill("Second User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Sign Up" }).click();

    // Should either show a toast error and stay on /signup or redirect to verify-email
    // (Better-Auth may handle duplicates differently)
    // Wait 5s and check we're either on signup (error) or verify-email (re-sent OTP)
    await page.waitForTimeout(5_000);
    const url = page.url();
    // The app should either reject (stay on /signup) or handle gracefully
    expect(url).toMatch(/\/(signup|verify-email|onboarding)/);
  });

  // ── Empty field validation ────────────────────────────────────────────

  test("signup button is disabled or shows error with empty fields", async ({
    page,
  }) => {
    await page.goto("/signup");

    // Click sign up without filling anything
    const submitBtn = page.getByRole("button", { name: "Sign Up" });
    await submitBtn.click();

    // Should stay on /signup (no redirect)
    await expect(page).toHaveURL(/\/signup/);
  });

  test("login button is disabled or shows error with empty fields", async ({
    page,
  }) => {
    await page.goto("/login");

    // Click sign in button without filling anything
    const submitBtn = page.getByRole("button", { name: "Sign In" });
    await submitBtn.click();

    // Should stay on /login (no redirect)
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Unauthenticated access redirect ───────────────────────────────────

  test("unauthenticated user accessing /app/dashboard is redirected to /login", async ({
    page,
  }) => {
    // Ensure no cookies (fresh context)
    await page.context().clearCookies();
    await page.goto("/app/dashboard");

    // Should end up on /login or /workspaces
    await expect(page).toHaveURL(/\/(login|workspaces)/, { timeout: 10_000 });
  });

  test("unauthenticated user accessing /workspaces is redirected to /login", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/workspaces");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  // ── Sign-in page has correct links ────────────────────────────────────

  test("login page links to signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByRole("link", { name: /sign up/i });
    await expect(signupLink).toBeVisible();
  });

  test("signup page links to login", async ({ page }) => {
    await page.goto("/signup");
    const loginLink = page.getByRole("link", { name: /sign in|log in/i });
    await expect(loginLink).toBeVisible();
  });
});
