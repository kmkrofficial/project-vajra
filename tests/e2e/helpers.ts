/**
 * Shared test helpers for Playwright E2E tests.
 * These helpers seed the database directly for test setup.
 */
import postgres from "postgres";

const TEST_DB_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/vajra_dev";

export function getTestDb() {
  return postgres(TEST_DB_URL, { prepare: false });
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
 * Clean up test data (run after tests).
 */
export async function cleanupTestData(workspaceId: string) {
  const sql = getTestDb();
  await sql`DELETE FROM gym_workspaces WHERE id = ${workspaceId}`;
  await sql.end();
}
