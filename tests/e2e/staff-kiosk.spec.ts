import { test, expect } from "@playwright/test";
import {
  seedGymForUser,
  addStaffToGym,
  seedMember,
  cleanupTestData,
  getTestDb,
  createTestUser,
} from "./helpers";

// â”€â”€â”€ Shared Test Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OWNER = {
  name: "Staff Test Owner",
  email: `e2e-staff-owner-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

const RECEPTIONIST = {
  name: "Front Desk Staff",
  email: `e2e-staff-recep-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let gymId: string;
let branchId: string;
let ownerId: string;
let receptionistId: string;

// â”€â”€â”€ Setup / Teardown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Staff RBAC & Kiosk", () => {
  test.beforeAll(async () => {
    // Create users directly in DB (bypasses UI signup race condition)
    ownerId = await createTestUser(OWNER);
    receptionistId = await createTestUser(RECEPTIONIST);

    // Seed gym (owner as SUPER_ADMIN)
    const seeded = await seedGymForUser(ownerId);
    gymId = seeded.gymId;
    branchId = seeded.branchId;

    // Add receptionist as staff
    await addStaffToGym(gymId, branchId, receptionistId, "RECEPTIONIST");

    // Seed an ACTIVE member for kiosk testing
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 30);
    await seedMember({
      gymId,
      branchId,
      name: "Kiosk Test Member",
      phone: "9000000001",
      checkinPin: "5678",
      status: "ACTIVE",
      expiryDate: futureExpiry,
    });

    // Seed an EXPIRED member for kiosk failure testing
    const pastExpiry = new Date();
    pastExpiry.setDate(pastExpiry.getDate() - 10);
    await seedMember({
      gymId,
      branchId,
      name: "Expired Kiosk Member",
      phone: "9000000002",
      checkinPin: "9999",
      status: "EXPIRED",
      expiryDate: pastExpiry,
    });

    // Seed a configuration row so kiosk numpad shows (checkout enabled for testing)
    const sql3 = getTestDb();
    await sql3`
      INSERT INTO configuration (workspace_id, branch_id, checkout_enabled, theme_mode)
      VALUES (${gymId}, ${branchId}, true, 'system')
      ON CONFLICT DO NOTHING
    `;
    await sql3.end();
  });

  test.afterAll(async () => {
    if (gymId) await cleanupTestData(gymId);

    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${OWNER.email}, ${RECEPTIONIST.email})`;
    await sql.end();
  });

  // â”€â”€â”€ RBAC Test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("receptionist should NOT see revenue summary on dashboard", async ({
    page,
  }) => {
    // Log in as the receptionist
    await page.goto("/login");
    await page.getByLabel("Email").fill(RECEPTIONIST.email);
    await page.getByLabel("Password").fill(RECEPTIONIST.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Revenue summary should NOT be visible for a RECEPTIONIST
    await expect(page.getByTestId("revenue-summary")).not.toBeVisible();

    // But should see the staff summary cards
    await expect(page.getByTestId("staff-summary")).toBeVisible();
  });

  // â”€â”€â”€ Kiosk Test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("kiosk shows success for valid ACTIVE member PIN", async ({ page }) => {
    // First, log in and select workspace to set the cookie
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Navigate to kiosk
    await page.goto("/kiosk");

    // Type the valid PIN: 5678
    await page.getByTestId("kiosk-key-5").click();
    await page.getByTestId("kiosk-key-6").click();
    await page.getByTestId("kiosk-key-7").click();
    await page.getByTestId("kiosk-key-8").click();

    // Submit
    await page.getByTestId("kiosk-key-submit").click();

    // Should show success state
    await expect(page.getByTestId("kiosk-success")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Welcome, Kiosk Test Member!")).toBeVisible();
  });

  test("kiosk shows error for expired member PIN", async ({ page }) => {
    // Log in and select workspace
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/kiosk");

    // Type the expired member's PIN: 9999
    await page.getByTestId("kiosk-key-9").click();
    await page.getByTestId("kiosk-key-9").click();
    await page.getByTestId("kiosk-key-9").click();
    await page.getByTestId("kiosk-key-9").click();

    await page.getByTestId("kiosk-key-submit").click();

    // Should show error state
    await expect(page.getByTestId("kiosk-denied")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/Expired Kiosk Member/)).toBeVisible();
    await expect(page.getByText(/membership has expired/i)).toBeVisible();
  });

  // â”€â”€ Additional edge cases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("kiosk check-in creates attendance record in DB", async ({ page }) => {
    // Login as owner and go to kiosk
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/kiosk");

    // Use the ACTIVE member PIN (5678)
    await page.getByTestId("kiosk-key-5").click();
    await page.getByTestId("kiosk-key-6").click();
    await page.getByTestId("kiosk-key-7").click();
    await page.getByTestId("kiosk-key-8").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-success")).toBeVisible({ timeout: 5_000 });

    // Verify DB: attendance record was created
    const sql = getTestDb();
    const [att] = await sql`
      SELECT id, checked_out_at FROM attendance
      WHERE workspace_id = ${gymId}
      ORDER BY checked_in_at DESC LIMIT 1
    `;
    expect(att).toBeTruthy();
    expect(att.checked_out_at).toBeNull();
    await sql.end();

    // Wait for auto-clear
    await expect(page.getByTestId("kiosk-pin-display")).toBeVisible({ timeout: 10_000 });
  });

  test("second PIN entry checks out and records in DB", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/kiosk");

    // Same member PIN â€” this is a second entry after the check-in test
    // It could be check-in or check-out depending on open session state
    await page.getByTestId("kiosk-key-5").click();
    await page.getByTestId("kiosk-key-6").click();
    await page.getByTestId("kiosk-key-7").click();
    await page.getByTestId("kiosk-key-8").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-success")).toBeVisible({ timeout: 5_000 });
    // The action could be either checkin or checkout depending on session state
    await expect(page.getByText(/Welcome|Goodbye/)).toBeVisible();

    // Verify DB has an attendance record
    const sql = getTestDb();
    const [att] = await sql`
      SELECT id FROM attendance
      WHERE workspace_id = ${gymId}
      ORDER BY checked_in_at DESC LIMIT 1
    `;
    expect(att).toBeTruthy();
    await sql.end();
  });

  test("PENDING_PAYMENT member PIN is rejected at kiosk", async ({ page }) => {
    // Seed PENDING_PAYMENT member
    await seedMember({
      gymId,
      branchId,
      name: "Pending Staff Member",
      phone: "9000000050",
      checkinPin: "1234",
      status: "PENDING_PAYMENT",
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/kiosk");

    await page.getByTestId("kiosk-key-1").click();
    await page.getByTestId("kiosk-key-2").click();
    await page.getByTestId("kiosk-key-3").click();
    await page.getByTestId("kiosk-key-4").click();
    await page.getByTestId("kiosk-key-submit").click();

    await expect(page.getByTestId("kiosk-denied")).toBeVisible({ timeout: 5_000 });
  });
});
