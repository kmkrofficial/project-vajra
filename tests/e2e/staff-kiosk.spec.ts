import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  addStaffToWorkspace,
  seedMember,
  cleanupTestData,
  getTestDb,
} from "./helpers";

// ─── Shared Test Data ───────────────────────────────────────────────────────

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

let workspaceId: string;
let branchId: string;
let ownerId: string;
let receptionistId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("Staff RBAC & Kiosk", () => {
  test.beforeAll(async ({ browser }) => {
    // Sign up the owner via UI
    const ownerPage = await browser.newPage();
    await ownerPage.goto("/signup");
    await ownerPage.getByLabel("Full Name").fill(OWNER.name);
    await ownerPage.getByLabel("Email").fill(OWNER.email);
    await ownerPage.getByLabel("Password").fill(OWNER.password);
    await ownerPage.getByRole("button", { name: "Sign Up" }).click();
    await expect(ownerPage).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await ownerPage.close();

    // Sign up the receptionist via UI
    const staffPage = await browser.newPage();
    await staffPage.goto("/signup");
    await staffPage.getByLabel("Full Name").fill(RECEPTIONIST.name);
    await staffPage.getByLabel("Email").fill(RECEPTIONIST.email);
    await staffPage.getByLabel("Password").fill(RECEPTIONIST.password);
    await staffPage.getByRole("button", { name: "Sign Up" }).click();
    await expect(staffPage).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await staffPage.close();

    // Get user IDs from database
    const sql = getTestDb();
    const [ownerRow] = await sql`SELECT id FROM "user" WHERE email = ${OWNER.email}`;
    const [staffRow] = await sql`SELECT id FROM "user" WHERE email = ${RECEPTIONIST.email}`;
    ownerId = ownerRow.id;
    receptionistId = staffRow.id;
    await sql.end();

    // Seed workspace (owner as SUPER_ADMIN)
    const seeded = await seedWorkspaceForUser(ownerId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Add receptionist as staff
    await addStaffToWorkspace(workspaceId, branchId, receptionistId, "RECEPTIONIST");

    // Seed an ACTIVE member for kiosk testing
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 30);
    await seedMember({
      workspaceId,
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
      workspaceId,
      branchId,
      name: "Expired Kiosk Member",
      phone: "9000000002",
      checkinPin: "9999",
      status: "EXPIRED",
      expiryDate: pastExpiry,
    });
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);

    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${OWNER.email}, ${RECEPTIONIST.email})`;
    await sql.end();
  });

  // ─── RBAC Test ──────────────────────────────────────────────────────────

  test("receptionist should NOT see revenue summary on dashboard", async ({
    page,
  }) => {
    // Log in as the receptionist
    await page.goto("/login");
    await page.getByLabel("Email").fill(RECEPTIONIST.email);
    await page.getByLabel("Password").fill(RECEPTIONIST.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    // Select the workspace
    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Revenue summary should NOT be visible for a RECEPTIONIST
    await expect(page.getByTestId("revenue-summary")).not.toBeVisible();

    // But the "Expiring Soon" section should be visible
    await expect(page.getByTestId("expiring-soon-section")).toBeVisible();
  });

  // ─── Kiosk Test ─────────────────────────────────────────────────────────

  test("kiosk shows success for valid ACTIVE member PIN", async ({ page }) => {
    // First, log in and select workspace to set the cookie
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    // Select workspace to set the branch cookie
    await page.locator("[data-testid^='workspace-card-']").first().click();
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
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10_000 });

    await page.locator("[data-testid^='workspace-card-']").first().click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/kiosk");

    // Type the expired member's PIN: 9999
    await page.getByTestId("kiosk-key-9").click();
    await page.getByTestId("kiosk-key-9").click();
    await page.getByTestId("kiosk-key-9").click();
    await page.getByTestId("kiosk-key-9").click();

    await page.getByTestId("kiosk-key-submit").click();

    // Should show error state
    await expect(page.getByTestId("kiosk-error")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Expired or Invalid PIN")).toBeVisible();
  });
});
