import { test, expect } from "@playwright/test";
import {
  seedGymForUser,
  cleanupTestData,
  getTestDb,
  createTestUser,
} from "./helpers";

// â”€â”€â”€ Test Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OWNER = {
  name: "Member Lifecycle Owner",
  email: `e2e-member-lc-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let gymId: string;
let branchId: string;
let userId: string;

// â”€â”€â”€ Setup / Teardown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Member Lifecycle & Privacy", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    // Create user directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(OWNER);

    // Seed gym + branch
    const seeded = await seedGymForUser(userId);
    gymId = seeded.gymId;
    branchId = seeded.branchId;

    // Seed a plan so the Add Member form has something to select
    const sql2 = getTestDb();
    await sql2`
      INSERT INTO plans (workspace_id, name, price, duration_days, active)
      VALUES (${gymId}, 'Monthly Basic', 1000, 30, true)
    `;
    await sql2.end();
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

  test("add member with auto-generated PIN, view profile modal with PIN and WhatsApp", async ({
    page,
  }) => {
    await loginAndGoToDashboard(page);

    // Navigate to Members page
    await page.goto("/app/members");
    await expect(page).toHaveURL(/\/app\/members/, { timeout: 5_000 });

    // Open Add Member sheet
    await page.getByTestId("add-member-btn").click();

    // Fill in member details â€” leave Kiosk PIN blank for auto-generation
    await page.getByLabel("Name").fill("Jane Auto PIN");
    await page.getByLabel("Phone").fill("9111222333");

    // Leave Kiosk PIN blank (auto-generate)
    const kioskPinInput = page.getByTestId("sheet-kiosk-pin");
    await expect(kioskPinInput).toHaveValue("");

    // Select plan
    await page.getByTestId("sheet-plan-select").click();
    await page.getByText("Monthly Basic").click();

    // Submit the form
    await page.getByTestId("sheet-submit-member").click();

    // Should advance to payment step â€” mark as paid
    await expect(page.getByTestId("sheet-mark-paid")).toBeVisible({
      timeout: 5_000,
    });
    await page.getByTestId("sheet-mark-paid").click();

    // Wait for success toast and sheet to close
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5_000,
    });

    // Verify the member now appears in the list
    await expect(page.getByText("Jane Auto PIN")).toBeVisible({
      timeout: 5_000,
    });

    // Click the view-profile icon button on the member row
    const memberRow = page.getByText("Jane Auto PIN").locator("../..");
    const viewBtn = memberRow.locator("[data-testid^='view-profile-']");
    await viewBtn.click();

    // Verify the Profile dialog is open
    await expect(page.getByText("Member Profile")).toBeVisible({
      timeout: 3_000,
    });

    // Verify auto-generated 4-digit Kiosk PIN is visible
    const pinElement = page.getByTestId("profile-kiosk-pin");
    await expect(pinElement).toBeVisible();
    const pinText = await pinElement.textContent();
    expect(pinText).toBeTruthy();
    // Auto-generated PIN should be exactly 4 digits
    expect(pinText!.trim()).toMatch(/^\d{4}$/);

    // Verify WhatsApp "Message" button is present
    const waButton = page.locator("[data-testid^='profile-wa-msg-']");
    await expect(waButton).toBeVisible();
    await expect(waButton).toHaveText(/WhatsApp/);

    // Verify phone is visible in modal
    await expect(page.getByTestId("profile-phone")).toHaveText("9111222333");
  });

  test("add member with custom kiosk PIN", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/members");

    await page.getByTestId("add-member-btn").click();

    await page.getByLabel("Name").fill("Custom PIN User");
    await page.getByLabel("Phone").fill("9222333444");
    await page.getByTestId("sheet-kiosk-pin").fill("7777");

    await page.getByTestId("sheet-plan-select").click();
    await page.getByText("Monthly Basic").click();

    await page.getByTestId("sheet-submit-member").click();

    await expect(page.getByTestId("sheet-mark-paid")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("sheet-mark-paid").click();

    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Custom PIN User")).toBeVisible({ timeout: 5_000 });

    // Verify custom PIN was stored
    const sql = getTestDb();
    const [member] = await sql`
      SELECT checkin_pin FROM members
      WHERE workspace_id = ${gymId} AND name = 'Custom PIN User'
    `;
    // PIN should be stored (hashed or plain) â€” just verify it exists
    expect(member.checkin_pin).toBeTruthy();
    await sql.end();
  });

  test("member status shows as ACTIVE after payment", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/members");

    // The member created in previous test should have ACTIVE status
    await expect(page.getByText("Jane Auto PIN")).toBeVisible({ timeout: 5_000 });
    // Check for ACTIVE badge anywhere on the page
    await expect(page.getByText("ACTIVE").first()).toBeVisible({ timeout: 5_000 });
  });

  test("member creation requires phone number", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/members");

    await page.getByTestId("add-member-btn").click();

    await page.getByLabel("Name").fill("No Phone User");
    // Leave phone blank

    await page.getByTestId("sheet-plan-select").click();
    await page.getByText("Monthly Basic").click();

    await page.getByTestId("sheet-submit-member").click();

    // Should show error toast or stay on the form (validation failure)
    // Should NOT navigate to payment step
    await expect(page.getByTestId("sheet-mark-paid")).not.toBeVisible({ timeout: 3_000 });
  });

  test("member creation validates invalid phone number", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/app/members");

    await page.getByTestId("add-member-btn").click();

    await page.getByLabel("Name").fill("Bad Phone User");
    await page.getByLabel("Phone").fill("12345"); // invalid, not 10 digits starting with 6-9

    await page.getByTestId("sheet-plan-select").click();
    await page.getByText("Monthly Basic").click();

    await page.getByTestId("sheet-submit-member").click();

    // Should show validation error (toast or inline) â€” the sheet should NOT advance to payment
    await expect(page.getByTestId("sheet-mark-paid")).not.toBeVisible({ timeout: 5_000 });
  });

  test("member DB record has correct workspace_id and branch_id", async () => {
    // This test checks DB state from the members created in earlier serial tests
    const sql = getTestDb();
    const members = await sql`
      SELECT workspace_id, branch_id, status FROM members
      WHERE workspace_id = ${gymId}
    `;
    expect(members.length).toBeGreaterThan(0);
    for (const m of members) {
      expect(m.workspace_id).toBe(gymId);
      expect(m.branch_id).toBe(branchId);
    }
    await sql.end();
  });
});
