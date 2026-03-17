import { test, expect } from "@playwright/test";
import { seedGymForUser, cleanupTestData, getTestDb, createTestUser } from "./helpers";

const TEST_USER = {
  name: "Revenue Test Owner",
  email: `e2e-revenue-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let gymId: string;
let userId: string;

test.describe("Owner Revenue Flow", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    // Create user directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(TEST_USER);

    // Seed gym
    const seeded = await seedGymForUser(userId);
    gymId = seeded.gymId;
  });

  test.afterAll(async () => {
    if (gymId) {
      await cleanupTestData(gymId);
    }
    // Clean up the test user
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${TEST_USER.email}`;
    await sql.end();
  });

  test("full revenue flow: create plan â†’ add member â†’ UPI QR â†’ mark paid", async ({
    page,
  }) => {
    // â”€â”€ Step 1: Login â”€â”€
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // â”€â”€ Step 3: Navigate to Plans and create a plan â”€â”€
    await page.goto("/app/settings/plans");
    await expect(page).toHaveURL(/\/app\/settings\/plans/);

    // Click "Create Plan"
    await page.getByTestId("create-plan-btn").click();

    // Fill out the plan form
    await page.getByLabel("Plan Name").fill("1 Month Standard");
    await page.getByLabel("Price (â‚¹)").fill("1500");
    await page.getByLabel("Duration (days)").fill("30");
    await page.getByTestId("submit-plan-btn").click();

    // Verify the plan appears in the table
    await expect(page.getByText("1 Month Standard")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("â‚¹1500")).toBeVisible();

    // â”€â”€ Step 4: Navigate to Members page and add a member â”€â”€
    await page.goto("/app/members");
    await page.getByTestId("add-member-btn").click();

    // Fill out member form
    await page.getByLabel("Name").fill("John Doe");
    await page.getByLabel("Phone").fill("9876543210");

    // Select the plan
    await page.getByTestId("sheet-plan-select").click();
    await page.getByText("1 Month Standard").click();

    // Submit to proceed to payment
    await page.getByTestId("sheet-submit-member").click();

    // â”€â”€ Step 5: Verify QR code appears â”€â”€
    await expect(page.getByTestId("upi-qr-code")).toBeVisible({
      timeout: 5_000,
    });
    // Verify the UPI string contains expected parts
    await expect(page.getByText("upi://pay")).toBeVisible();

    // â”€â”€ Step 6: Mark as paid â”€â”€
    await page.getByTestId("sheet-mark-paid").click();

    // Verify success toast
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5_000,
    });

    // Verify the member now shows as ACTIVE in the members list
    await expect(page.getByText("John Doe")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("[data-slot='badge']").filter({ hasText: "ACTIVE" })).toBeVisible();
  });

  test("created plan appears in plans list with correct price", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/settings/plans");
    await expect(page.getByText("1 Month Standard")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("â‚¹1500")).toBeVisible();
  });

  test("UPI string contains workspace UPI ID", async ({ page }) => {
    // Login and go to dashboard
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Add another member via the members page
    await page.goto("/app/members");
    await page.getByTestId("add-member-btn").click();

    await page.getByLabel("Name").fill("UPI Check User");
    await page.getByLabel("Phone").fill("9888777666");

    await page.getByTestId("sheet-plan-select").click();
    await page.getByText("1 Month Standard").click();

    await page.getByTestId("sheet-submit-member").click();

    // Should show payment step with UPI QR and the workspace UPI ID
    await expect(page.getByTestId("upi-qr-code")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("testowner@upi")).toBeVisible({ timeout: 5_000 });
  });

  test("transaction record exists in DB after creating member", async () => {
    const sql = getTestDb();
    const transactions = await sql`
      SELECT id, amount, payment_method, status FROM transactions
      WHERE workspace_id = ${gymId}
      ORDER BY created_at DESC
    `;
    expect(transactions.length).toBeGreaterThan(0);
    // At least one transaction should exist from the first test
    expect(transactions[0].payment_method).toBe("UPI");
    await sql.end();
  });

  test("marking payment as paid creates audit log", async () => {
    const sql = getTestDb();
    const [log] = await sql`
      SELECT action FROM audit_logs
      WHERE workspace_id = ${gymId} AND action = 'MARK_AS_PAID'
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(log).toBeTruthy();
    expect(log.action).toBe("MARK_AS_PAID");
    await sql.end();
  });
});
