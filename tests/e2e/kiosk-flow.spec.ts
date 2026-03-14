import { test, expect } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";
import {
  seedWorkspaceForUser,
  seedMember,
  cleanupTestData,
  getTestDb,
} from "./helpers";

/** Hash a PIN the same way the app does (scrypt + random salt → "salt:hash"). */
function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ─── Test Data ──────────────────────────────────────────────────────────────

const OWNER = {
  name: "Kiosk Flow Owner",
  email: `e2e-kiosk-flow-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;
let userId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("Kiosk Self-Service Loop", () => {
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

    // Seed workspace
    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    // Set a kiosk exit PIN on the configuration table (hashed, like the app stores it)
    const hashedPin = hashPin("1234");
    const sql2 = getTestDb();
    await sql2`
      INSERT INTO configuration (workspace_id, branch_id, kiosk_pin, theme_mode)
      VALUES (${workspaceId}, ${branchId}, ${hashedPin}, 'system')
      ON CONFLICT DO NOTHING
    `;
    await sql2.end();

    // Seed an ACTIVE member with PIN 5678
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 30);
    await seedMember({
      workspaceId,
      branchId,
      name: "Kiosk Gym Member",
      phone: "9000000099",
      checkinPin: "5678",
      status: "ACTIVE",
      expiryDate: futureExpiry,
    });
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

  test("kiosk check-in with valid PIN shows success and clears", async ({
    page,
  }) => {
    await loginAndSelectWorkspace(page);

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

    // Should show success message with member name
    await expect(page.getByTestId("kiosk-success")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Welcome, Kiosk Gym Member!")).toBeVisible();

    // Wait for auto-clear (success goes back to idle after a timeout)
    // The PIN display should return to empty after the success state clears
    await expect(page.getByTestId("kiosk-pin-display")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("kiosk exit button returns to dashboard", async ({ page }) => {
    await loginAndSelectWorkspace(page);

    // Navigate to kiosk
    await page.goto("/kiosk");
    await expect(page.getByTestId("kiosk-root")).toBeVisible({
      timeout: 5_000,
    });

    // Click the hidden exit button (top-right, opacity-0 but clickable)
    await page.getByTestId("kiosk-exit-btn").click({ force: true });

    // Exit modal should appear
    await expect(page.getByTestId("kiosk-exit-input")).toBeVisible({
      timeout: 3_000,
    });

    // Type the exit PIN
    await page.getByTestId("kiosk-exit-input").fill("1234");
    await page.getByTestId("kiosk-exit-submit").click();

    // Should navigate back to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });
});
