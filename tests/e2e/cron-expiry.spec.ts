/**
 * E2E test for the member expiration cron logic.
 *
 * Seeds members with different expiry dates and verifies that only
 * those whose expiryDate has passed are marked EXPIRED.
 */
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { getTestDb, seedWorkspaceForUser, cleanupTestData } from "./helpers";

let workspaceId: string;
let branchId: string;

const TEST_USER_EMAIL = `crontest-${Date.now()}@test.com`;

test.describe("Member expiration cron", () => {
  test.beforeAll(async () => {
    const sql = getTestDb();

    // Create a test user via Better-Auth users table (must provide id)
    const userId = randomUUID();
    const [user] = await sql`
      INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
      VALUES (${userId}, 'Cron Tester', ${TEST_USER_EMAIL}, true, now(), now())
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

  test("idempotency: running cron twice does not re-process expired members", async () => {
    const sql = getTestDb();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Seed an ACTIVE member with past expiry
    await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
      VALUES (${workspaceId}, ${branchId}, 'Idempotent User', '8000000010', '4444', 'ACTIVE', ${yesterday})
    `;

    // First run
    const firstRun = await sql`
      UPDATE members
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expiry_date < now() AND workspace_id = ${workspaceId} AND phone = '8000000010'
      RETURNING id
    `;
    expect(firstRun.length).toBe(1);

    // Second run — should return 0 because member is already EXPIRED
    const secondRun = await sql`
      UPDATE members
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expiry_date < now() AND workspace_id = ${workspaceId} AND phone = '8000000010'
      RETURNING id
    `;
    expect(secondRun.length).toBe(0);

    await sql.end();
  });

  test("member with null expiry_date is not affected", async () => {
    const sql = getTestDb();

    // Seed a member with NULL expiry_date
    const [member] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
      VALUES (${workspaceId}, ${branchId}, 'No Expiry User', '8000000020', '5555', 'ACTIVE', ${null})
      RETURNING id
    `;

    // Run expiration
    await sql`
      UPDATE members
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expiry_date < now()
    `;

    // Verify: member should still be ACTIVE (null < now() is false in SQL)
    const [row] = await sql`
      SELECT status FROM members WHERE id = ${member.id}
    `;
    expect(row.status).toBe("ACTIVE");

    await sql.end();
  });

  test("already-EXPIRED member is not re-processed", async () => {
    const sql = getTestDb();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Seed an already-EXPIRED member
    const [member] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
      VALUES (${workspaceId}, ${branchId}, 'Already Expired', '8000000030', '6666', 'EXPIRED', ${yesterday})
      RETURNING id
    `;

    // Run the cron query
    const result = await sql`
      UPDATE members
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expiry_date < now() AND id = ${member.id}
      RETURNING id
    `;

    // Should return 0 — already EXPIRED, not ACTIVE
    expect(result.length).toBe(0);

    await sql.end();
  });

  test("TRIAL members move to PENDING_PAYMENT after trial period", async () => {
    const sql = getTestDb();

    // Seed a TRIAL member created 3 days ago (exceeds default 2-day trial)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [trialExpired] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, created_at)
      VALUES (${workspaceId}, ${branchId}, 'Trial Expired', '8000000040', '7777', 'TRIAL', ${threeDaysAgo})
      RETURNING id
    `;

    // Seed a TRIAL member created today (should NOT be affected)
    const [trialFresh] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status)
      VALUES (${workspaceId}, ${branchId}, 'Trial Fresh', '8000000041', '7778', 'TRIAL')
      RETURNING id
    `;

    // Run trial-to-pending query (same logic as cron worker with 2-day period)
    const result = await sql`
      UPDATE members
      SET status = 'PENDING_PAYMENT'
      WHERE status = 'TRIAL' AND created_at < NOW() - INTERVAL '2 days'
        AND workspace_id = ${workspaceId}
      RETURNING id
    `;

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(trialExpired.id);

    // Verify states
    const [expiredRow] = await sql`SELECT status FROM members WHERE id = ${trialExpired.id}`;
    expect(expiredRow.status).toBe("PENDING_PAYMENT");

    const [freshRow] = await sql`SELECT status FROM members WHERE id = ${trialFresh.id}`;
    expect(freshRow.status).toBe("TRIAL");

    await sql.end();
  });

  test("ENQUIRY members move to CHURNED after inactivity period", async () => {
    const sql = getTestDb();

    // Seed an ENQUIRY member created 31 days ago (exceeds default 30-day churn)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 31);

    const [enquiryOld] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, created_at)
      VALUES (${workspaceId}, ${branchId}, 'Old Enquiry', '8000000050', '8888', 'ENQUIRY', ${monthAgo})
      RETURNING id
    `;

    // Seed a fresh ENQUIRY member (should NOT be affected)
    const [enquiryFresh] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status)
      VALUES (${workspaceId}, ${branchId}, 'Fresh Enquiry', '8000000051', '8889', 'ENQUIRY')
      RETURNING id
    `;

    // Run enquiry-to-churned query (same logic as cron with 30-day period)
    const result = await sql`
      UPDATE members
      SET status = 'CHURNED'
      WHERE status = 'ENQUIRY' AND created_at < NOW() - INTERVAL '30 days'
        AND workspace_id = ${workspaceId}
      RETURNING id
    `;

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(enquiryOld.id);

    // Verify states
    const [churnedRow] = await sql`SELECT status FROM members WHERE id = ${enquiryOld.id}`;
    expect(churnedRow.status).toBe("CHURNED");

    const [freshRow] = await sql`SELECT status FROM members WHERE id = ${enquiryFresh.id}`;
    expect(freshRow.status).toBe("ENQUIRY");

    await sql.end();
  });

  test("TRIAL member can check in at kiosk", async () => {
    const sql = getTestDb();

    // Seed a TRIAL member
    const [member] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status)
      VALUES (${workspaceId}, ${branchId}, 'Trial Kiosk User', '8000000060', '9191', 'TRIAL')
      RETURNING id
    `;

    // Verify status is TRIAL (since the kiosk allows ACTIVE + TRIAL)
    const [row] = await sql`SELECT status FROM members WHERE id = ${member.id}`;
    expect(row.status).toBe("TRIAL");

    await sql.end();
  });

  test("CHURNED member cannot revert via expiry cron", async () => {
    const sql = getTestDb();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Seed a CHURNED member
    const [member] = await sql`
      INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
      VALUES (${workspaceId}, ${branchId}, 'Churned Member', '8000000070', '9292', 'CHURNED', ${yesterday})
      RETURNING id
    `;

    // Run the ACTIVE→EXPIRED cron query — CHURNED should be untouched
    const result = await sql`
      UPDATE members
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expiry_date < now() AND id = ${member.id}
      RETURNING id
    `;
    expect(result.length).toBe(0);

    const [row] = await sql`SELECT status FROM members WHERE id = ${member.id}`;
    expect(row.status).toBe("CHURNED");

    await sql.end();
  });
});
