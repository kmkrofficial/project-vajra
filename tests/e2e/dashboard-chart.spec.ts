import { test, expect } from "@playwright/test";
import {
  seedWorkspaceForUser,
  seedMember,
  addStaffToWorkspace,
  cleanupTestData,
  getTestDb,
  createTestUser,
  loginAndSelectWorkspace,
} from "./helpers";

const OWNER = {
  name: "Dashboard Chart Owner",
  email: `e2e-dashboard-chart-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

const STAFF = {
  name: "Dashboard Staff",
  email: `e2e-dashboard-staff-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let workspaceId: string;
let branchId: string;
let userId: string;
let staffId: string;

test.describe("Dashboard Hourly Activity", () => {
  test.beforeAll(async () => {
    // Create users directly in DB (bypasses UI signup race condition)
    userId = await createTestUser(OWNER);
    staffId = await createTestUser(STAFF);

    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;

    await addStaffToWorkspace(workspaceId, branchId, staffId, "RECEPTIONIST");

    // Seed attendance data across multiple days so the average hourly chart has data
    const memberId = await seedMember({
      workspaceId,
      branchId,
      name: "Chart Test Member",
      phone: "9000000100",
      checkinPin: "1199",
      status: "ACTIVE",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const sql2 = getTestDb();
    const now = new Date();
    // Seed check-ins at 9 AM for today and 2 previous days
    for (let daysAgo = 0; daysAgo < 3; daysAgo++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 9, 0, 0);
      await sql2`
        INSERT INTO attendance (workspace_id, branch_id, member_id, checked_in_at)
        VALUES (${workspaceId}, ${branchId}, ${memberId}, ${d})
      `;
    }
    await sql2.end();
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email IN (${OWNER.email}, ${STAFF.email})`;
    await sql.end();
  });

  // ── Tests ─────────────────────────────────────────────────────────────

  test("dashboard renders hourly activity chart card", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);

    // The hourly activity card should be visible on the dashboard
    await expect(page.getByTestId("hourly-activity-card")).toBeVisible({
      timeout: 10_000,
    });

    // Either the chart bars or the "No check-in data" message should render
    const chartOrEmpty = page.locator(
      "[data-testid='hourly-activity-chart']"
    ).or(page.getByText("No check-in data recorded yet"));
    await expect(chartOrEmpty.first()).toBeVisible({ timeout: 5_000 });
  });

  test("dashboard shows today's check-in count with seeded data", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);

    // The checkin count card should be visible
    await expect(page.getByTestId("hourly-activity-card")).toBeVisible({
      timeout: 10_000,
    });

    // The chart should show data since we seeded attendance
    await expect(page.getByTestId("hourly-activity-chart")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("admin sees revenue summary on dashboard", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);

    // Admin should see revenue summary section
    await expect(page.getByTestId("revenue-summary")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("staff does not see revenue summary on dashboard", async ({ page }) => {
    await loginAndSelectWorkspace(page, STAFF, expect);

    // Staff should NOT see revenue summary
    await expect(page.getByTestId("revenue-summary")).not.toBeVisible({
      timeout: 5_000,
    });

    // But should see the expiring soon section
    await expect(page.getByTestId("expiring-soon-section")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("dashboard FABs are visible for admin", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);

    await expect(page.getByTestId("fab-add-member")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("fab-launch-kiosk")).toBeVisible({ timeout: 5_000 });
  });
});
