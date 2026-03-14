import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  cleanupTestData,
  getTestDb,
} from "./helpers";

// ─── Test Data ──────────────────────────────────────────────────────────────

const OWNER = {
  name: "Member Lifecycle Owner",
  email: `e2e-member-lc-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;
let userId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("Member Lifecycle & Privacy", () => {
  test.beforeAll(async ({ browser }) => {
    // Sign up owner via UI
    const page = await browser.newPage();
    await page.goto("/signup");
    await page.getByLabel("Full Name").fill(OWNER.name);
    await page.getByLabel("Email").fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await page.close();

    // Get user ID
    const sql = getTestDb();
    const [row] = await sql`SELECT id FROM "user" WHERE email = ${OWNER.email}`;
    userId = row.id;
    await sql.end();

    // Seed workspace + branch
    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Seed a plan so the Add Member form has something to select
    const sql2 = getTestDb();
    await sql2`
      INSERT INTO plans (workspace_id, name, price, duration_days, active)
      VALUES (${workspaceId}, 'Monthly Basic', 1000, 30, true)
    `;
    await sql2.end();
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

  test("add member with auto-generated PIN, view profile modal with PIN and WhatsApp", async ({
    page,
  }) => {
    await loginAndSelectWorkspace(page);

    // Navigate to Members page
    await page.goto("/app/members");
    await expect(page).toHaveURL(/\/app\/members/, { timeout: 5_000 });

    // Open Add Member sheet
    await page.getByTestId("add-member-btn").click();

    // Fill in member details — leave Kiosk PIN blank for auto-generation
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

    // Should advance to payment step — mark as paid
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

    // Click "View" on the member row to open the privacy modal
    const memberRow = page.getByText("Jane Auto PIN").locator("../..");
    const viewBtn = memberRow.locator("button", { hasText: "View" });
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
});
