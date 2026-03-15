/**
 * Shared test helpers for Playwright E2E tests.
 * These helpers seed the database directly for test setup.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { scryptAsync } from "@noble/hashes/scrypt";
import postgres from "postgres";

const TEST_DB_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/vajra_dev";

export function getTestDb() {
  return postgres(TEST_DB_URL, { prepare: false });
}

/**
 * Wait for a user to appear in the database (handles race with signup).
 * Retries up to 10 times with 500ms delay.
 */
export async function waitForUser(email: string): Promise<string> {
  const sql = getTestDb();
  for (let i = 0; i < 10; i++) {
    const [row] = await sql`SELECT id FROM "user" WHERE email = ${email}`;
    if (row) {
      await sql.end();
      return row.id as string;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await sql.end();
  throw new Error(`User ${email} not found in DB after retries`);
}

/**
 * Create a user directly in the database with a Better-Auth–compatible password hash.
 * This bypasses the UI signup flow to avoid race conditions under parallel workers.
 * Uses @noble/hashes/scrypt with the same params as Better-Auth (N=16384, r=16, p=1, dkLen=64).
 */
export async function createTestUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  const sql = getTestDb();
  const userId = randomUUID();

  // Hash password with Better-Auth–compatible scrypt params (@noble/hashes)
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(data.password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  const passwordHash = `${salt}:${Buffer.from(key).toString("hex")}`;

  await sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, ${data.name}, ${data.email}, true, now(), now())
  `;
  await sql`
    INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now())
  `;
  await sql.end();
  return userId;
}

/**
 * Seed a workspace with a branch and assign a user to it as SUPER_ADMIN.
 * Returns the workspace & branch IDs.
 */
export async function seedWorkspaceForUser(userId: string) {
  const sql = getTestDb();

  // Create workspace
  const [workspace] = await sql`
    INSERT INTO gym_workspaces (name, primary_branch_name, owner_upi_id)
    VALUES ('Test Gym', 'Main Branch', 'testowner@upi')
    RETURNING id
  `;

  // Create branch
  const [branch] = await sql`
    INSERT INTO branches (workspace_id, name, contact_phone)
    VALUES (${workspace.id}, 'Main Branch', '9999999999')
    RETURNING id
  `;

  // Link user as SUPER_ADMIN
  await sql`
    INSERT INTO workspace_users (workspace_id, user_id, role, assigned_branch_id)
    VALUES (${workspace.id}, ${userId}, 'SUPER_ADMIN', ${branch.id})
  `;

  await sql.end();

  return {
    workspaceId: workspace.id as string,
    branchId: branch.id as string,
  };
}

/**
 * Add a staff user to an existing workspace with a given role.
 */
export async function addStaffToWorkspace(
  workspaceId: string,
  branchId: string,
  userId: string,
  role: "RECEPTIONIST" | "TRAINER" | "MANAGER"
) {
  const sql = getTestDb();
  await sql`
    INSERT INTO workspace_users (workspace_id, user_id, role, assigned_branch_id)
    VALUES (${workspaceId}, ${userId}, ${role}, ${branchId})
  `;
  await sql.end();
}

/**
 * Seed a member directly in the database (for testing kiosk, etc.).
 */
export async function seedMember(data: {
  workspaceId: string;
  branchId: string;
  name: string;
  phone: string;
  checkinPin: string;
  status: "ACTIVE" | "EXPIRED" | "PENDING_PAYMENT" | "TRIAL" | "ENQUIRY" | "CHURNED";
  expiryDate?: Date;
}) {
  const sql = getTestDb();
  const [member] = await sql`
    INSERT INTO members (workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date)
    VALUES (${data.workspaceId}, ${data.branchId}, ${data.name}, ${data.phone},
            ${data.checkinPin}, ${data.status}, ${data.expiryDate ?? null})
    RETURNING id
  `;
  await sql.end();
  return member.id as string;
}

/**
 * Clean up test data (run after tests).
 */
export async function cleanupTestData(workspaceId: string) {
  const sql = getTestDb();
  await sql`DELETE FROM gym_workspaces WHERE id = ${workspaceId}`;
  await sql.end();
}

/**
 * Resilient login helper.
 * Under heavy parallel load the dev server can be slow to respond to
 * scrypt-based password verification, so we retry once before giving up.
 */
export async function loginAs(
  page: import("@playwright/test").Page,
  user: { email: string; password: string },
  expect: typeof import("@playwright/test").expect
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    try {
      await expect(page).toHaveURL(/\/workspaces/, { timeout: 12_000 });
      return; // success
    } catch {
      if (attempt === 1) throw new Error(`Login failed for ${user.email} after 2 attempts`);
    }
  }
}

/**
 * Login and select the first workspace card, ending at /app/dashboard.
 */
export async function loginAndSelectWorkspace(
  page: import("@playwright/test").Page,
  user: { email: string; password: string },
  expect: typeof import("@playwright/test").expect
) {
  await loginAs(page, user, expect);
  await page.locator("[data-testid^='workspace-card-']").first().click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
}
