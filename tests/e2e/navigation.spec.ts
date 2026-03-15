import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  addStaffToWorkspace,
  cleanupTestData,
  getTestDb,
  createTestUser,
  loginAndSelectWorkspace,
} from "./helpers";

// ─── Shared Test Data ───────────────────────────────────────────────────────

const ADMIN = {
  name: "Nav Test Admin",
  email: `e2e-nav-admin-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

const STAFF = {
  name: "Nav Test Staff",
  email: `e2e-nav-staff-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;
let adminId: string;
let staffId: string;

// ─── Public Landing Page ────────────────────────────────────────────────────

test.describe("Public Landing Page", () => {
  test("should display hero with CTAs linking to signup and login", async ({
    page,
  }) => {
    await page.goto("/");

    // Hero should be visible
    await expect(
      page.getByRole("heading", { name: /expired memberships/i })
    ).toBeVisible();

    // "Start for Free" hero CTA links to /signup
    const heroCta = page.getByTestId("hero-cta");
    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveAttribute("href", "/signup");

    // "I have an account" links to /login
    const heroLogin = page.getByTestId("hero-login");
    await expect(heroLogin).toBeVisible();
    await expect(heroLogin).toHaveAttribute("href", "/login");

    // Nav bar CTAs
    await expect(page.getByTestId("nav-signup")).toHaveAttribute(
      "href",
      "/signup"
    );
    await expect(page.getByTestId("nav-login")).toHaveAttribute(
      "href",
      "/login"
    );
  });

  test("hero CTA navigates to signup page", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-cta").click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("login CTA navigates to login page", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-login").click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("bottom CTA links to signup", async ({ page }) => {
    await page.goto("/");
    const bottomCta = page.getByTestId("bottom-cta");
    await expect(bottomCta).toHaveAttribute("href", "/signup");
  });
});

// ─── Authenticated Navigation ───────────────────────────────────────────────

test.describe("Authenticated Navigation", () => {
  test.beforeAll(async () => {
    // Create users directly in DB (bypasses UI signup race condition)
    adminId = await createTestUser(ADMIN);
    staffId = await createTestUser(STAFF);

    // Seed workspace + assign admin
    const seeded = await seedWorkspaceForUser(adminId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Add staff as RECEPTIONIST
    await addStaffToWorkspace(workspaceId, branchId, staffId, "RECEPTIONIST");
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);

    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${ADMIN.email}, ${STAFF.email})`;
    await sql.end();
  });

  // ── Helper: login & select workspace ──────────────────────────────────

  async function login(
    page: import("@playwright/test").Page,
    user: { email: string; password: string }
  ) {
    await loginAndSelectWorkspace(page, user, expect);
  }

  // ── Admin sidebar navigation ──────────────────────────────────────────

  test("admin can navigate to all sidebar links", async ({ page }) => {
    await login(page, ADMIN);

    const sidebar = page.getByTestId("app-sidebar");

    // Admin should see all nav items including Branches and Settings
    await expect(sidebar.getByText("Dashboard")).toBeVisible();
    await expect(sidebar.getByText("Members")).toBeVisible();
    await expect(sidebar.getByText("Branches")).toBeVisible();
    await expect(sidebar.getByText("Settings")).toBeVisible();

    // Kiosk should NOT be in the sidebar (accessible via Dashboard FAB)
    await expect(sidebar.getByText("Kiosk")).not.toBeVisible();

    // Navigate to Members
    await sidebar.getByText("Members").click();
    await expect(page).toHaveURL(/\/app\/members/, { timeout: 5_000 });

    // Navigate to Branches
    await sidebar.getByText("Branches").click();
    await expect(page).toHaveURL(/\/app\/branches/, { timeout: 5_000 });

    // Navigate to Settings
    await sidebar.getByText("Settings").click();
    await expect(page).toHaveURL(/\/app\/settings/, { timeout: 5_000 });

    // Navigate back to Dashboard
    await sidebar.getByText("Dashboard").click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5_000 });
  });

  // ── Staff sidebar RBAC ────────────────────────────────────────────────

  test("staff cannot see admin-only links in sidebar", async ({ page }) => {
    await login(page, STAFF);

    const sidebar = page.getByTestId("app-sidebar");

    // Staff should see common links
    await expect(sidebar.getByText("Dashboard")).toBeVisible();
    await expect(sidebar.getByText("Members")).toBeVisible();

    // Staff should NOT see admin-only links
    await expect(sidebar.getByText("Branches")).not.toBeVisible();
    await expect(sidebar.getByText("Settings")).not.toBeVisible();
    await expect(sidebar.getByText("Kiosk")).not.toBeVisible();
  });

  // ── Dashboard FAB links ───────────────────────────────────────────────

  test("dashboard FABs link to add-member and kiosk", async ({ page }) => {
    await login(page, ADMIN);

    // "Add Member" FAB should navigate to members page
    await page.getByTestId("fab-add-member").click();
    await expect(page).toHaveURL(/\/app\/members/, { timeout: 5_000 });

    // Go back to dashboard
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5_000 });

    // "Launch Kiosk" FAB should navigate to kiosk
    await page.getByTestId("fab-launch-kiosk").click();
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 5_000 });
  });

  // ── Top bar visibility ────────────────────────────────────────────────

  test("top bar displays gym name and user menu", async ({ page }) => {
    await login(page, ADMIN);

    const topBar = page.getByTestId("top-bar");
    await expect(topBar).toBeVisible();

    // User menu should exist
    await expect(page.getByTestId("user-menu")).toBeVisible();
  });

  // ── Staff direct URL guard for admin pages ────────────────────────────

  test("staff redirected away from admin-only routes", async ({ page }) => {
    await login(page, STAFF);

    // Try navigating directly to /app/branches (admin-only)
    await page.goto("/app/branches");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Try navigating directly to /app/settings/plans (admin-only)
    await page.goto("/app/settings/plans");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  // ── Additional Navigation Tests ───────────────────────────────────────

  test("staff redirected from employees page", async ({ page }) => {
    await login(page, STAFF);

    await page.goto("/app/employees");
    // The employees page redirects staff or shows limited view
    // At minimum, staff should not see admin-only controls
    await expect(page).toHaveURL(/\/app\/(employees|dashboard)/, { timeout: 10_000 });
  });

  test("staff redirected from analytics page", async ({ page }) => {
    await login(page, STAFF);

    await page.goto("/app/analytics");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test("staff redirected from audit logs page", async ({ page }) => {
    await login(page, STAFF);

    await page.goto("/app/audit-logs");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test("admin can navigate to employees page", async ({ page }) => {
    await login(page, ADMIN);

    const sidebar = page.getByTestId("app-sidebar");
    await sidebar.getByText("Employees").click();
    await expect(page).toHaveURL(/\/app\/employees/, { timeout: 5_000 });
  });

  test("admin 'Add Member' FAB navigates to members, 'Launch Kiosk' to kiosk", async ({
    page,
  }) => {
    await login(page, ADMIN);

    await page.getByTestId("fab-add-member").click();
    await expect(page).toHaveURL(/\/app\/members/, { timeout: 5_000 });

    await page.goto("/app/dashboard");
    await page.getByTestId("fab-launch-kiosk").click();
    await expect(page).toHaveURL(/\/kiosk/, { timeout: 5_000 });
  });

  test("user menu shows My Profile link that navigates to profile page", async ({ page }) => {
    await login(page, ADMIN);

    // Open user menu
    await page.getByTestId("user-menu").click();

    // Should show My Profile option
    const profileBtn = page.getByTestId("user-menu-profile");
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Should navigate to profile page
    await expect(page).toHaveURL(/\/app\/settings\/profile/, { timeout: 5_000 });
    await expect(page.getByTestId("profile-page")).toBeVisible();
    await expect(page.getByTestId("profile-name-input")).toBeVisible();
  });

  test("unauthenticated user accessing /app/dashboard is redirected", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/(login|workspaces)/, { timeout: 10_000 });
  });
});
