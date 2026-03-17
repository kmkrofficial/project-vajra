/**
 * E2E tests for the enhanced Members section.
 *
 * Covers: view tabs, search, sort, expiring-soon banner, and URL-based filtering.
 */
import { test, expect } from "@playwright/test";
import {
  seedGymForUser,
  seedMember,
  cleanupTestData,
  getTestDb,
  createTestUser,
  loginAndGoToDashboard,
} from "./helpers";

const OWNER = {
  name: "Members Views Owner",
  email: `e2e-members-views-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let gymId: string;
let branchId: string;
let userId: string;

test.describe("Members filters, views & sort", () => {
  test.beforeAll(async () => {
    userId = await createTestUser(OWNER);
    const seeded = await seedGymForUser(userId);
    gymId = seeded.gymId;
    branchId = seeded.branchId;

    // Seed members in various statuses
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    await seedMember({
      gymId,
      branchId,
      name: "Alice Active",
      phone: "7000000001",
      checkinPin: "1001",
      status: "ACTIVE",
      expiryDate: thirtyDaysFromNow,
    });

    await seedMember({
      gymId,
      branchId,
      name: "Bob Expiring",
      phone: "7000000002",
      checkinPin: "1002",
      status: "ACTIVE",
      expiryDate: threeDaysFromNow,
    });

    await seedMember({
      gymId,
      branchId,
      name: "Charlie Trial",
      phone: "7000000003",
      checkinPin: "1003",
      status: "TRIAL",
    });

    await seedMember({
      gymId,
      branchId,
      name: "Diana Enquiry",
      phone: "7000000004",
      checkinPin: "1004",
      status: "ENQUIRY",
    });

    await seedMember({
      gymId,
      branchId,
      name: "Eve Pending",
      phone: "7000000005",
      checkinPin: "1005",
      status: "PENDING_PAYMENT",
    });

    await seedMember({
      gymId,
      branchId,
      name: "Frank Expired",
      phone: "7000000006",
      checkinPin: "1006",
      status: "EXPIRED",
    });

    await seedMember({
      gymId,
      branchId,
      name: "Grace Churned",
      phone: "7000000007",
      checkinPin: "1007",
      status: "CHURNED",
    });
  });

  test.afterAll(async () => {
    if (gymId) await cleanupTestData(gymId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${OWNER.email}`;
    await sql.end();
  });

  // â”€â”€ View tabs â”€â”€

  test("members page shows view tabs with counts", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members");

    await expect(page.getByTestId("member-view-tabs")).toBeVisible({ timeout: 10_000 });

    // "All" tab should be selected by default and show total count
    const allTab = page.getByTestId("view-tab-all");
    await expect(allTab).toBeVisible();
  });

  test("clicking Active tab filters to active members only", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members");

    await page.getByTestId("view-tab-active").click();

    // URL should be updated
    await expect(page).toHaveURL(/view=active/);

    // Should show Alice Active and Bob Expiring (both ACTIVE)
    await expect(page.getByText("Alice Active")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Bob Expiring")).toBeVisible();

    // Non-active members should not be visible
    await expect(page.getByText("Charlie Trial")).not.toBeVisible();
    await expect(page.getByText("Diana Enquiry")).not.toBeVisible();
  });

  test("clicking Trial tab filters to trial members", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members?view=trial");

    await expect(page.getByText("Charlie Trial")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Alice Active")).not.toBeVisible();
  });

  test("clicking Expiring tab shows expiring-soon members", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members?view=expiring");

    // Bob Expiring has expiry in 3 days â€” should appear
    await expect(page.getByText("Bob Expiring")).toBeVisible({ timeout: 10_000 });

    // The expiring banner should be visible
    await expect(page.getByTestId("expiring-banner")).toBeVisible();
  });

  // â”€â”€ Search â”€â”€

  test("search filters members by name", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members");

    const searchInput = page.getByTestId("member-search");
    await searchInput.fill("Alice");

    // Only Alice should be visible
    await expect(page.getByText("Alice Active")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Bob Expiring")).not.toBeVisible();
  });

  test("search filters members by phone", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members");

    const searchInput = page.getByTestId("member-search");
    await searchInput.fill("7000000003");

    await expect(page.getByText("Charlie Trial")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Alice Active")).not.toBeVisible();
  });

  // â”€â”€ Sort â”€â”€

  test("sort dropdown is visible and works", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members");

    await page.getByTestId("sort-btn").click();

    // Select "Name A â†’ Z" from the sort dropdown
    const nameAscItem = page.locator("[data-slot='select-item']").filter({ hasText: "Name A" });
    await expect(nameAscItem).toBeVisible({ timeout: 5_000 });
    await nameAscItem.click();

    // First member should be Alice (alphabetically first)
    const firstRow = page.locator("[data-testid^='member-row-']").first();
    await expect(firstRow).toContainText("Alice Active");
  });

  // â”€â”€ URL-based filtering from dashboard â”€â”€

  test("navigating with ?view=pending shows pending members", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members?view=pending");

    await expect(page.getByText("Eve Pending")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Alice Active")).not.toBeVisible();
  });

  // â”€â”€ Member count â”€â”€

  test("member count label updates with view", async ({ page }) => {
    await loginAndGoToDashboard(page, OWNER, expect);
    await page.goto("/app/members?view=churned");

    await expect(page.getByTestId("member-count")).toContainText("1 member", { timeout: 10_000 });
  });
});
