/**
 * Audit Log Cleanup Worker
 *
 * Self-hosted cron script that permanently deletes audit_logs older
 * than a configurable retention period (read from config.yml) across
 * all tenants to conserve DB space.
 *
 * Usage:
 *   npx tsx scripts/cleanup-audit.ts
 *   (or via package.json: npm run cron:cleanup-audit)
 *
 * Crontab example (run weekly on Sunday at 3 AM IST):
 *   0 3 * * 0 cd /app && npx tsx scripts/cleanup-audit.ts >> /var/log/vajra-audit-cleanup.log 2>&1
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { pgTable, uuid, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";

// ─── Read config.yml via centralised loader ────────────────────────────────

import { loadConfig } from "../lib/config";

// ─── Minimal schema (just what the script needs) ────────────────────────────

const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  userId: text("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const started = new Date();
  console.log(`[${started.toISOString()}] Audit cleanup worker started.`);

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const retentionMonths = loadConfig().schedulers.auditRetentionMonths;
  console.log(`  Config → audit_retention_months: ${retentionMonths}`);

  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  const db = drizzle(client);

  try {
    const deleted = await db
      .delete(auditLogs)
      .where(sql`${auditLogs.createdAt} < NOW() - INTERVAL '${sql.raw(String(retentionMonths))} months'`)
      .returning({ id: auditLogs.id });

    const duration = Date.now() - started.getTime();
    console.log(
      `[${new Date().toISOString()}] Done. Deleted ${deleted.length} audit log(s) older than ${retentionMonths} months in ${duration}ms.`
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Audit cleanup FAILED:`, error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

main();
