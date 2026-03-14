/**
 * Daily Expiration Worker
 *
 * Self-hosted cron script that marks ACTIVE members with a past
 * expiry_date as EXPIRED. Designed to run via a standard Linux cron
 * job on our VPS, NOT through Vercel Cron or Next.js API routes.
 *
 * Usage:
 *   npx tsx scripts/daily-expiry.ts
 *   (or via package.json: npm run cron:expire)
 *
 * Crontab example (run daily at 2 AM IST):
 *   0 2 * * * cd /app && npx tsx scripts/daily-expiry.ts >> /var/log/vajra-cron.log 2>&1
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, lt } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

// ─── Minimal schema (just what the script needs) ────────────────────────────

const memberStatusEnum = pgEnum("member_status", [
  "ACTIVE",
  "EXPIRED",
  "PENDING_PAYMENT",
]);

const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  branchId: uuid("branch_id").notNull(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  checkinPin: varchar("checkin_pin", { length: 4 }).notNull(),
  status: memberStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const started = new Date();
  console.log(`[${started.toISOString()}] Expiry worker started.`);

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  const db = drizzle(client);

  try {
    const now = new Date();

    const expired = await db
      .update(members)
      .set({ status: "EXPIRED" })
      .where(and(eq(members.status, "ACTIVE"), lt(members.expiryDate, now)))
      .returning({ id: members.id, name: members.name });

    const duration = Date.now() - started.getTime();
    console.log(
      `[${new Date().toISOString()}] Done. Marked ${expired.length} member(s) as EXPIRED in ${duration}ms.`
    );

    if (expired.length > 0) {
      for (const m of expired) {
        console.log(`  → ${m.name} (${m.id})`);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Expiry worker FAILED:`, error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

main();
