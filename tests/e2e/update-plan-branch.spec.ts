import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  cleanupTestData,
  getTestDb,
} from "./helpers";

// ─── Test Data ──────────────────────────────────────────────────────────────

const OWNER = {
  name: "Update Feature Owner",
  email: `e2e-update-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;
let userId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("Plan & Branch Updates", () => {
  test.beforeAll(async ({ browser }) => {
    // Clean up stale test user from interrupted runs
    const cleanSql = getTestDb();
    const [existing] = await cleanSql`SELECT id FROM "user" WHERE email = ${OWNER.email}`;
    if (existing) {
      await cleanSql`DELETE FROM gym_workspaces WHERE id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = ${existing.id}
      )`;
      await cleanSql`DELETE FROM "user" WHERE id = ${existing.id}`;
    }
    await cleanSql.end();

    const page = await browser.newPage();
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill(OWNER.name);
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/(verify-email|onboarding)/, { timeout: 10_000 });
    await page.close();

    const sql = getTestDb();
    const [row] = await sql`SELECT id FROM "user" WHERE email = ${OWNER.email}`;
    userId = row.id;
    await sql`UPDATE "user" SET email_verified = true WHERE id = ${userId}`;
    await sql.end();

    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${OWNER.email}`;
    await sql.end();
  });

  // ── Helper ────────────────────────────────────────────────────────────

  async function loginAndSelectWorkspace(
    page: import("@playwright/test").Page
  ) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });
    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // ── Tests ─────────────────────────────────────────────────────────────

  test("owner creates a plan then edits its name, price, and duration", async ({
    page,
  }) => {
    await loginAndSelectWorkspace(page);

    // ── Step 1: Create a plan ──
    await page.goto("/app/settings/plans");
    await expect(page).toHaveURL(/\/app\/settings\/plans/);

    await page.getByTestId("create-plan-btn").click();
    await page.getByLabel("Plan Name").fill("3 Month Gold");
    await page.getByLabel("Price (₹)").fill("3000");
    await page.getByLabel("Duration (days)").fill("90");
    await page.getByTestId("submit-plan-btn").click();

    // Verify plan appears
    await expect(page.getByText("3 Month Gold")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("₹3000")).toBeVisible();

    // ── Step 2: Click edit on the new plan ──
    const editBtn = page.locator("[data-testid^='edit-plan-']").last();
    await editBtn.click();

    // ── Step 3: Update all three fields ──
    const nameInput = page.getByTestId("edit-plan-name");
    const priceInput = page.getByTestId("edit-plan-price");
    const durationInput = page.getByTestId("edit-plan-duration");

    await nameInput.clear();
    await nameInput.fill("3 Month Platinum");
    await priceInput.clear();
    await priceInput.fill("3500");
    await durationInput.clear();
    await durationInput.fill("100");

    await page.getByTestId("submit-edit-plan").click();

    // Verify success toast
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /updated/i })
    ).toBeVisible({ timeout: 5_000 });

    // ── Step 4: Verify updated values ──
    await expect(page.getByText("3 Month Platinum")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("₹3500")).toBeVisible();
    await expect(page.getByText("100 days")).toBeVisible();

    // Verify in DB
    const sql = getTestDb();
    const [plan] = await sql`
      SELECT name, price, duration_days FROM plans
      WHERE workspace_id = ${workspaceId} AND name = '3 Month Platinum'
    `;
    expect(plan.name).toBe("3 Month Platinum");
    expect(plan.price).toBe(3500);
    expect(plan.duration_days).toBe(100);
    await sql.end();
  });

  test("owner creates a branch then edits its name and phone", async ({
    page,
  }) => {
    await loginAndSelectWorkspace(page);

    // ── Step 1: Create a new branch ──
    await page.goto("/app/branches");
    await expect(page).toHaveURL(/\/app\/branches/, { timeout: 5_000 });

    await page.getByTestId("create-branch-btn").click();
    await page.getByTestId("branch-name-input").fill("Eastside Gym");
    await page.getByTestId("branch-submit").click();

    await expect(page.getByText("Eastside Gym")).toBeVisible({
      timeout: 5_000,
    });

    // ── Step 2: Click edit on the new branch ──
    const branchCard = page.locator("[data-testid^='branch-row-']").filter({
      hasText: "Eastside Gym",
    });
    const editBtn = branchCard.locator("[data-testid^='edit-branch-']");
    await editBtn.click();

    // ── Step 3: Update name and phone ──
    const nameInput = page.getByTestId("edit-branch-name");
    const phoneInput = page.getByTestId("edit-branch-phone");

    await nameInput.clear();
    await nameInput.fill("Eastside Platinum Gym");
    await phoneInput.clear();
    await phoneInput.fill("9123456789");

    await page.getByTestId("submit-edit-branch").click();

    // Verify success toast
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /updated/i })
    ).toBeVisible({ timeout: 5_000 });

    // ── Step 4: Verify updated values on the page ──
    await expect(page.getByText("Eastside Platinum Gym")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("9123456789")).toBeVisible();

    // Verify in DB
    const sql = getTestDb();
    const [branch] = await sql`
      SELECT name, contact_phone FROM branches
      WHERE workspace_id = ${workspaceId} AND name = 'Eastside Platinum Gym'
    `;
    expect(branch.name).toBe("Eastside Platinum Gym");
    expect(branch.contact_phone).toBe("9123456789");
    await sql.end();
  });

  test("owner updates branch GPS coordinates", async ({ page }) => {
    await loginAndSelectWorkspace(page);
    await page.goto("/app/branches");

    // Edit the seeded "Main Branch"
    const branchCard = page.locator("[data-testid^='branch-row-']").filter({
      hasText: "Main Branch",
    });
    const editBtn = branchCard.locator("[data-testid^='edit-branch-']");
    await editBtn.click();

    // Fill in GPS coordinates
    const latInput = page.getByTestId("edit-branch-lat");
    const lngInput = page.getByTestId("edit-branch-lng");
    await latInput.clear();
    await latInput.fill("12.9716");
    await lngInput.clear();
    await lngInput.fill("77.5946");

    await page.getByTestId("submit-edit-branch").click();

    // Verify success toast
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /updated/i })
    ).toBeVisible({ timeout: 5_000 });

    // After update, the "No GPS" badge should be replaced with "GPS Set"
    const updatedCard = page.locator("[data-testid^='branch-row-']").filter({
      hasText: "Main Branch",
    });
    await expect(updatedCard.getByText("GPS Set")).toBeVisible({
      timeout: 5_000,
    });

    // Verify in DB
    const sql = getTestDb();
    const [branch] = await sql`
      SELECT latitude, longitude FROM branches
      WHERE id = ${branchId}
    `;
    expect(parseFloat(branch.latitude)).toBeCloseTo(12.9716, 3);
    expect(parseFloat(branch.longitude)).toBeCloseTo(77.5946, 3);
    await sql.end();
  });
});
