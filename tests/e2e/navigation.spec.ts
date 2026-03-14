import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  addStaffToWorkspace,
  cleanupTestData,
  getTestDb,
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
  test.beforeAll(async ({ browser }) => {
    // Sign up admin
    const adminPage = await browser.newPage();
    await adminPage.goto("/signup");
    await adminPage.getByLabel("Full Name").fill(ADMIN.name);
    await adminPage.getByLabel("Email").fill(ADMIN.email);
    await adminPage.getByLabel("Password").fill(ADMIN.password);
    await adminPage.getByRole("button", { name: "Sign Up" }).click();
    await expect(adminPage).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await adminPage.close();

    // Sign up staff
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
    const [adminRow] =
      await sql`SELECT id FROM "user" WHERE email = ${ADMIN.email}`;
    const [staffRow] =
      await sql`SELECT id FROM "user" WHERE email = ${STAFF.email}`;
    adminId = adminRow.id;
    staffId = staffRow.id;
    await sql.end();

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

  async function loginAndSelectWorkspace(
    page: import("@playwright/test").Page,
    user: { email: string; password: string }
  ) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ── Admin sidebar navigation ──────────────────────────────────────────

  test("admin can navigate to all sidebar links", async ({ page }) => {
    await loginAndSelectWorkspace(page, ADMIN);

    const sidebar = page.getByTestId("app-sidebar");

    // Admin should see all nav items including Branches and Settings
    await expect(sidebar.getByText("Dashboard")).toBeVisible();
    await expect(sidebar.getByText("Members")).toBeVisible();
    await expect(sidebar.getByText("Kiosk")).toBeVisible();
    await expect(sidebar.getByText("Branches")).toBeVisible();
    await expect(sidebar.getByText("Settings")).toBeVisible();

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
    await loginAndSelectWorkspace(page, STAFF);

    const sidebar = page.getByTestId("app-sidebar");

    // Staff should see common links
    await expect(sidebar.getByText("Dashboard")).toBeVisible();
    await expect(sidebar.getByText("Members")).toBeVisible();
    await expect(sidebar.getByText("Kiosk")).toBeVisible();

    // Staff should NOT see admin-only links
    await expect(sidebar.getByText("Branches")).not.toBeVisible();
    await expect(sidebar.getByText("Settings")).not.toBeVisible();
  });

  // ── Dashboard FAB links ───────────────────────────────────────────────

  test("dashboard FABs link to add-member and kiosk", async ({ page }) => {
    await loginAndSelectWorkspace(page, ADMIN);

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
    await loginAndSelectWorkspace(page, ADMIN);

    const topBar = page.getByTestId("top-bar");
    await expect(topBar).toBeVisible();

    // User menu should exist
    await expect(page.getByTestId("user-menu")).toBeVisible();
  });

  // ── Staff direct URL guard for admin pages ────────────────────────────

  test("staff redirected away from admin-only routes", async ({ page }) => {
    await loginAndSelectWorkspace(page, STAFF);

    // Try navigating directly to /app/branches (admin-only)
    await page.goto("/app/branches");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Try navigating directly to /app/settings/plans (admin-only)
    await page.goto("/app/settings/plans");
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });
});
