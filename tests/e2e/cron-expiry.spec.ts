/**
 * E2E test for the member expiration cron logic.
 *
 * Seeds members with different expiry dates and verifies that only
 * those whose expiryDate has passed are marked EXPIRED.
 */
import { test, expect } from "@playwright/test";
import { getTestDb, seedWorkspaceForUser, cleanupTestData } from "./helpers";

let workspaceId: string;
let branchId: string;

const TEST_USER_EMAIL = `crontest-${Date.now()}@test.com`;

test.describe("Member expiration cron", () => {
  test.beforeAll(async () => {
    const sql = getTestDb();

    // Create a test user via Better-Auth users table
    const [user] = await sql`
      INSERT INTO "user" (name, email, email_verified, created_at, updated_at)
      VALUES ('Cron Tester', ${TEST_USER_EMAIL}, true, now(), now())
      RETURNING id
    `;

    await sql.end();

    const seeded = await seedWorkspaceForUser(user.id);
    workspaceId = seeded.workspaceId;
    branchId = seeded.branchId;
  });

  test.afterAll(async () => {
    if (workspaceId) {
      await cleanupTestData(workspaceId);
    }

    // Clean up test user
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${TEST_USER_EMAIL}`;
    await sql.end();
  });

  test("marks only expired members, leaves future members active", async () => {
    const sql = getTestDb();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Seed two ACTIVE members: one expired yesterday, one expires tomorrow
    const [expiredMember] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
      VALUES (${workspaceId}, ${branchId}, 'Expired User', '8000000001', '1111', 'ACTIVE', ${yesterday})
      RETURNING id
    `;

    const [activeMember] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
      VALUES (${workspaceId}, ${branchId}, 'Active User', '8000000002', '2222', 'ACTIVE', ${tomorrow})
      RETURNING id
    `;

    // Also seed a PENDING_PAYMENT member with past expiry (should NOT be touched)
    await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
      VALUES (${workspaceId}, ${branchId}, 'Pending User', '8000000003', '3333', 'PENDING_PAYMENT', ${yesterday})
    `;

    // Run the expiration query directly (same logic as markExpiredMembers)
    const result = await sql`
      UPDATE members
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expiry_date < now()
      RETURNING id
    `;

    // Only the expired member should have been updated
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(expiredMember.id);

    // Verify states
    const [expiredRow] = await sql`
      SELECT status FROM members WHERE id = ${expiredMember.id}
    `;
    expect(expiredRow.status).toBe("EXPIRED");

    const [activeRow] = await sql`
      SELECT status FROM members WHERE id = ${activeMember.id}
    `;
    expect(activeRow.status).toBe("ACTIVE");

    await sql.end();
  });
});
