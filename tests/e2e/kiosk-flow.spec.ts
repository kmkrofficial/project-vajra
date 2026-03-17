import { test, expect } from "@playwright/test";
import {
  seedGymForUser,
  seedMember,
  cleanupTestData,
  getTestDb,
  createTestUser,
} from "./helpers";

// â”€â”€â”€ Test Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OWNER = {
  name: "Kiosk Flow Owner",
  email: `e2e-kiosk-flow-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let gymId: string;
let branchId: string;
let userId: string;

// â”€â”€â”€ Setup / Teardown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe.serial("Kiosk Self-Service Loop", () => {
  test.beforeAll(async () => {
    // Create user directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(OWNER);

    // Seed gym
    const seeded = await seedGymForUser(userId);
    gymId = seeded.gymId;
    branchId = seeded.branchId;

    // Create configuration row with checkout enabled for test
    const sql2 = getTestDb();
    await sql2`
      INSERT INTO configuration (workspace_id, branch_id, checkout_enabled, theme_mode)
      VALUES (${gymId}, ${branchId}, true, 'system')
      ON CONFLICT DO NOTHING
    `;
    await sql2.end();

    // Seed an ACTIVE member with PIN 5678
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 30);
    await seedMember({
      gymId,
      branchId,
      name: "Kiosk Gym Member",
      phone: "9000000099",
      checkinPin: "5678",
      status: "ACTIVE",
      expiryDate: futureExpiry,
    });
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

  test("kiosk check-in with valid PIN shows success and clears", async ({
    page,
  }) => {
    await loginAndGoToDashboard(page);

    // Navigate to kiosk
    await page.goto("/kiosk");

    // If kiosk numpad is visible, proceed
    await expect(page.getByTestId("kiosk-root")).toBeVisible({
      timeout: 5_000,
    });

    // Type PIN: 5, 6, 7, 8
    await page.getByTestId("kiosk-key-5").click();
    await page.getByTestId("kiosk-key-6").click();
    await page.getByTestId("kiosk-key-7").click();
    await page.getByTestId("kiosk-key-8").click();

    // Submit
    await page.getByTestId("kiosk-key-submit").click();

    // Should show success with "Checked in"
    await expect(page.getByTestId("kiosk-success")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Welcome, Kiosk Gym Member!")).toBeVisible();
    await expect(page.getByText("Have a great workout!")).toBeVisible();

    // Verify attendance record was created in DB
    const sql = getTestDb();
    const [att] = await sql`
      SELECT id, checked_out_at FROM attendance
      WHERE workspace_id = ${gymId}
      ORDER BY checked_in_at DESC LIMIT 1
    `;
    expect(att).toBeTruthy();
    expect(att.checked_out_at).toBeNull();
    await sql.end();

    // Wait for auto-clear (success goes back to idle after a timeout)
    await expect(page.getByTestId("kiosk-pin-display")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("second PIN entry checks out the member", async ({
    page,
  }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({
      timeout: 5_000,
    });

    // Enter same PIN again â€” should check out
    await page.getByTestId("kiosk-key-5").click();
    await page.getByTestId("kiosk-key-6").click();
    await page.getByTestId("kiosk-key-7").click();
    await page.getByTestId("kiosk-key-8").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-success")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Goodbye, Kiosk Gym Member!")).toBeVisible();
    await expect(page.getByText(/see you next time/i)).toBeVisible();

    // Verify attendance record now has a checkout timestamp
    const sql = getTestDb();
    const [att] = await sql`
      SELECT checked_out_at FROM attendance
      WHERE workspace_id = ${gymId}
      ORDER BY checked_in_at DESC LIMIT 1
    `;
    expect(att.checked_out_at).not.toBeNull();
    await sql.end();

    await expect(page.getByTestId("kiosk-pin-display")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("kiosk exit button returns to dashboard", async ({ page }) => {
    await loginAndGoToDashboard(page);

    // Navigate to kiosk
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({
      timeout: 5_000,
    });

    // Click the "â† Dashboard" link (top-right corner)
    await page.getByTestId("kiosk-exit-btn").click();

    // Should navigate back to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  // â”€â”€ Edge Cases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("kiosk shows error for non-existent PIN", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    // Enter a PIN that doesn't match any member
    await page.getByTestId("kiosk-key-0").click();
    await page.getByTestId("kiosk-key-0").click();
    await page.getByTestId("kiosk-key-0").click();
    await page.getByTestId("kiosk-key-1").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-error")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/couldn[\u2019']t identify your PIN/)).toBeVisible();
  });

  test("submit button is disabled when less than 4 digits entered", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    // Enter only 3 digits
    await page.getByTestId("kiosk-key-1").click();
    await page.getByTestId("kiosk-key-2").click();
    await page.getByTestId("kiosk-key-3").click();

    // Submit button should be disabled
    await expect(page.getByTestId("kiosk-key-submit")).toBeDisabled();
  });

  test("clear button resets PIN entry", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    // Enter 3 digits then clear
    await page.getByTestId("kiosk-key-1").click();
    await page.getByTestId("kiosk-key-2").click();
    await page.getByTestId("kiosk-key-3").click();
    await page.getByTestId("kiosk-key-clear").click();

    // Submit should be disabled again (PIN is empty)
    await expect(page.getByTestId("kiosk-key-submit")).toBeDisabled();
  });

  test("kiosk rejects PENDING_PAYMENT member PIN with friendly message", async ({ page }) => {
    // Seed a PENDING_PAYMENT member
    await seedMember({
      gymId,
      branchId,
      name: "Pending Member",
      phone: "9000000088",
      checkinPin: "4321",
      status: "PENDING_PAYMENT",
    });

    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("kiosk-key-4").click();
    await page.getByTestId("kiosk-key-3").click();
    await page.getByTestId("kiosk-key-2").click();
    await page.getByTestId("kiosk-key-1").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-denied")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Pending Member/)).toBeVisible();
    await expect(page.getByText(/complete your payment/i)).toBeVisible();
  });

  test("kiosk rejects EXPIRED member PIN with friendly message", async ({ page }) => {
    const pastExpiry = new Date();
    pastExpiry.setDate(pastExpiry.getDate() - 10);
    await seedMember({
      gymId,
      branchId,
      name: "Expired Kiosk User",
      phone: "9000000077",
      checkinPin: "8765",
      status: "EXPIRED",
      expiryDate: pastExpiry,
    });

    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("kiosk-key-8").click();
    await page.getByTestId("kiosk-key-7").click();
    await page.getByTestId("kiosk-key-6").click();
    await page.getByTestId("kiosk-key-5").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-denied")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Expired Kiosk User/)).toBeVisible();
    await expect(page.getByText(/membership has expired/i)).toBeVisible();
  });

  test("kiosk shows expiry warning for near-expiry member", async ({ page }) => {
    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() + 2);
    await seedMember({
      gymId,
      branchId,
      name: "Almost Expired User",
      phone: "9000000055",
      checkinPin: "2233",
      status: "ACTIVE",
      expiryDate: nearExpiry,
    });

    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("kiosk-key-2").click();
    await page.getByTestId("kiosk-key-2").click();
    await page.getByTestId("kiosk-key-3").click();
    await page.getByTestId("kiosk-key-3").click();
    await page.getByTestId("kiosk-key-submit").click();

    // Should still check in (warning state, not denied)
    await expect(page.getByTestId("kiosk-warning")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Welcome, Almost Expired User!")).toBeVisible();
    await expect(page.getByText(/plan ends in \d+ day/i)).toBeVisible();

    // Verify attendance was still recorded
    const sql = getTestDb();
    const rows = await sql`
      SELECT id FROM attendance
      WHERE workspace_id = ${gymId}
      ORDER BY checked_in_at DESC LIMIT 1
    `;
    expect(rows.length).toBeGreaterThan(0);
    await sql.end();
  });

  test("kiosk auto-returns to idle after error overlay", async ({ page }) => {
    await loginAndGoToDashboard(page);
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({ timeout: 5_000 });

    // Enter invalid PIN
    await page.getByTestId("kiosk-key-0").click();
    await page.getByTestId("kiosk-key-0").click();
    await page.getByTestId("kiosk-key-0").click();
    await page.getByTestId("kiosk-key-2").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-error")).toBeVisible({ timeout: 5_000 });

    // Should auto-return to idle after timeout (4s)
    await expect(page.getByTestId("kiosk-pin-display")).toBeVisible({ timeout: 10_000 });
  });
});
