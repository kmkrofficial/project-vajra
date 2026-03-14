import { test, expect } from "@playwright/test";
import { seedWorkspaceForUser, cleanupTestData, getTestDb } from "./helpers";

const TEST_USER = {
  name: "Revenue Test Owner",
  email: `e2e-revenue-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let userId: string;

test.describe("Owner Revenue Flow", () => {
  test.beforeAll(async ({ browser }) => {
    // Sign up the test user via the UI to get a real auth session
    const page = await browser.newPage();
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill(TEST_USER.name);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });

    // Get the user ID from database for seeding
    const sql = getTestDb();
    const [user] = await sql`
      SELECT id FROM "user" WHERE email = ${TEST_USER.email}
    `;
    userId = user.id;
    await sql.end();

    // Seed workspace
    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;

    await page.close();
  });

  test.afterAll(async () => {
    if (workspaceId) {
      await cleanupTestData(workspaceId);
    }
    // Clean up the test user
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${TEST_USER.email}`;
    await sql.end();
  });

  test("full revenue flow: create plan → add member → UPI QR → mark paid", async ({
    page,
  }) => {
    // ── Step 1: Login ──
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    // ── Step 2: Select workspace ──
    // Click on the workspace card
    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // ── Step 3: Navigate to Plans and create a plan ──
    await page.goto("/app/settings/plans");
    await expect(page).toHaveURL(/\/app\/settings\/plans/);

    // Click "Create Plan"
    await page.getByTestId("create-plan-btn").click();

    // Fill out the plan form
    await page.getByLabel("Plan Name").fill("1 Month Standard");
    await page.getByLabel("Price (₹)").fill("1500");
    await page.getByLabel("Duration (days)").fill("30");
    await page.getByTestId("submit-plan-btn").click();

    // Verify the plan appears in the table
    await expect(page.getByText("1 Month Standard")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("₹1500")).toBeVisible();

    // ── Step 4: Navigate to Dashboard and add a member ──
    await page.goto("/app/dashboard");
    await page.getByTestId("add-member-btn").click();

    // Fill out member form
    await page.getByLabel("Name").fill("John Doe");
    await page.getByLabel("Phone").fill("9876543210");

    // Select the plan
    await page.getByTestId("plan-select").click();
    await page.getByText("1 Month Standard").click();

    // Submit to proceed to payment
    await page.getByTestId("submit-member-btn").click();

    // ── Step 5: Verify QR code appears ──
    await expect(page.getByTestId("upi-qr-code")).toBeVisible({
      timeout: 5_000,
    });
    // Verify the UPI string contains expected parts
    await expect(page.getByText("upi://pay")).toBeVisible();

    // ── Step 6: Mark as paid ──
    await page.getByTestId("mark-paid-btn").click();

    // Verify success toast
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5_000,
    });

    // Verify the member now shows as ACTIVE in the members list
    await expect(page.getByText("John Doe")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("ACTIVE")).toBeVisible();
  });
});
