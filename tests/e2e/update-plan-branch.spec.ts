import { test, expect } from "@playwright/test";
import {
  seedGymForUser,
  cleanupTestData,
  getTestDb,
  createTestUser,
} from "./helpers";

// â”€â”€â”€ Test Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OWNER = {
  name: "Update Feature Owner",
  email: `e2e-update-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let gymId: string;
let branchId: string;
let userId: string;

// â”€â”€â”€ Setup / Teardown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Plan & Branch Updates", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
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

    // Create user directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(OWNER);

    const seeded = await seedGymForUser(userId);
    gymId = seeded.gymId;
    branchId = seeded.branchId;
  });

  test.afterAll(async () => {
    if (gymId) await cleanupTestData(gymId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${OWNER.email}`;
    await sql.end();
  });

  // â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function loginAndGoToDashboard(
    page: import("@playwright/test").Page
  ) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  // â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("owner creates a plan then edits its name, price, and duration", async ({
    page,
  }) => {
    await loginAndGoToDashboard(page);

    // â”€â”€ Step 1: Create a plan â”€â”€
    await page.goto("/app/settings/plans");
    await expect(page).toHaveURL(/\/app\/settings\/plans/);

    await page.getByTestId("create-plan-btn").click();
    await page.getByLabel("Plan Name").fill("3 Month Gold");
    await page.getByLabel("Price (â‚¹)").fill("3000");
    await page.getByLabel("Duration (days)").fill("90");
    await page.getByTestId("submit-plan-btn").click();

    // Verify plan appears
    await expect(page.getByText("3 Month Gold")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("â‚¹3000")).toBeVisible();

    // â”€â”€ Step 2: Click edit on the new plan â”€â”€
    const editBtn = page.locator("[data-testid^='edit-plan-']").last();
    await editBtn.click();

    // â”€â”€ Step 3: Update all three fields â”€â”€
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

    // â”€â”€ Step 4: Verify updated values â”€â”€
    await expect(page.getByText("3 Month Platinum")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("â‚¹3500")).toBeVisible();
    await expect(page.getByText("100 days")).toBeVisible();

    // Verify in DB
    const sql = getTestDb();
    const [plan] = await sql`
      SELECT name, price, duration_days FROM plans
      WHERE workspace_id = ${gymId} AND name = '3 Month Platinum'
    `;
    expect(plan.name).toBe("3 Month Platinum");
    expect(plan.price).toBe(3500);
    expect(plan.duration_days).toBe(100);
    await sql.end();
  });

  test("owner creates a branch then edits its name and phone", async ({
    page,
  }) => {
    await loginAndGoToDashboard(page);

    // â”€â”€ Step 1: Create a new branch â”€â”€
    await page.goto("/app/branches");
    await expect(page).toHaveURL(/\/app\/branches/, { timeout: 5_000 });

    await page.getByTestId("create-branch-btn").click();
    await page.getByTestId("branch-name-input").fill("Eastside Gym");
    await page.getByTestId("branch-submit").click();

    await expect(page.getByText("Eastside Gym")).toBeVisible({
      timeout: 5_000,
    });

    // â”€â”€ Step 2: Click edit on the new branch â”€â”€
    const branchCard = page.locator("[data-testid^='branch-row-']").filter({
      hasText: "Eastside Gym",
    });
    const editBtn = branchCard.locator("[data-testid^='edit-branch-']");
    await editBtn.click();

    // â”€â”€ Step 3: Update name and phone â”€â”€
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

    // â”€â”€ Step 4: Verify updated values on the page â”€â”€
    await expect(page.getByText("Eastside Platinum Gym")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("9123456789")).toBeVisible();

    // Verify in DB
    const sql = getTestDb();
    const [branch] = await sql`
      SELECT name, contact_phone FROM branches
      WHERE workspace_id = ${gymId} AND name = 'Eastside Platinum Gym'
    `;
    expect(branch.name).toBe("Eastside Platinum Gym");
    expect(branch.contact_phone).toBe("9123456789");
    await sql.end();
  });

  test("owner updates branch GPS coordinates", async ({ page }) => {
    await loginAndGoToDashboard(page);
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

  // â”€â”€ Plan Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("plan name less than 2 chars shows validation error", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/settings/plans");

    // Wait for the plan to be visible on the page
    await expect(page.getByText("3 Month Platinum")).toBeVisible({ timeout: 10_000 });

    // Edit the existing plan
    const editBtn = page.locator("[data-testid^='edit-plan-']").last();
    await editBtn.click();

    const nameInput = page.getByTestId("edit-plan-name");
    await nameInput.clear();
    await nameInput.fill("A"); // < 2 chars

    await page.getByTestId("submit-edit-plan").click();

    // Should show error toast
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });
  });

  test("plan price less than 1 shows validation error", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/settings/plans");

    await expect(page.getByText("3 Month Platinum")).toBeVisible({ timeout: 10_000 });

    const editBtn = page.locator("[data-testid^='edit-plan-']").last();
    await editBtn.click();

    const priceInput = page.getByTestId("edit-plan-price");
    await priceInput.clear();
    await priceInput.fill("0"); // < â‚¹1

    await page.getByTestId("submit-edit-plan").click();

    // HTML5 min=1 validation prevents form submission for values < 1.
    // Verify the input is marked invalid (rangeUnderflow) and the dialog stays open.
    const isInvalid = await priceInput.evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBe(true);
    // Dialog should still be open (form didn't submit)
    await expect(page.getByTestId("submit-edit-plan")).toBeVisible();
  });

  test("plan duration less than 1 day shows validation error", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/settings/plans");

    await expect(page.getByText("3 Month Platinum")).toBeVisible({ timeout: 10_000 });

    const editBtn = page.locator("[data-testid^='edit-plan-']").last();
    await editBtn.click();

    const durationInput = page.getByTestId("edit-plan-duration");
    await durationInput.clear();
    await durationInput.fill("0"); // < 1 day

    await page.getByTestId("submit-edit-plan").click();

    // HTML5 min=1 validation prevents form submission for values < 1.
    const isInvalid = await durationInput.evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBe(true);
    // Dialog should still be open (form didn't submit)
    await expect(page.getByTestId("submit-edit-plan")).toBeVisible();
  });

  // â”€â”€ Branch Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("branch name less than 2 chars shows validation error", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/branches");

    const branchCard = page.locator("[data-testid^='branch-row-']").filter({
      hasText: "Main Branch",
    });
    await branchCard.locator("[data-testid^='edit-branch-']").click();

    const nameInput = page.getByTestId("edit-branch-name");
    await nameInput.clear();
    await nameInput.fill("A"); // < 2 chars

    await page.getByTestId("submit-edit-branch").click();

    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });
  });

  // â”€â”€ DB verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("plan creation generates audit log", async () => {
    const sql = getTestDb();
    const [log] = await sql`
      SELECT action FROM audit_logs
      WHERE workspace_id = ${gymId} AND action = 'CREATE_PLAN'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(log).toBeTruthy();
    expect(log.action).toBe("CREATE_PLAN");
    await sql.end();
  });

  test("branch creation generates audit log", async () => {
    const sql = getTestDb();
    const [log] = await sql`
      SELECT action FROM audit_logs
      WHERE workspace_id = ${gymId} AND action = 'CREATE_BRANCH'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(log).toBeTruthy();
    expect(log.action).toBe("CREATE_BRANCH");
    await sql.end();
  });
});
