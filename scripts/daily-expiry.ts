/**
 * Daily Expiration Worker
 *
 * Self-hosted cron script that processes member status transitions:
 *   1. ACTIVE  → EXPIRED         (expiry_date has passed)
 *   2. TRIAL   → PENDING_PAYMENT (trial period exhausted — configurable days)
 *   3. ENQUIRY → CHURNED         (no activity within configurable days)
 *
 * All duration thresholds are read from config.yml at startup, with sensible
 * defaults if a value is missing.
 *
 * Usage:
 *   npx tsx scripts/daily-expiry.ts
 *   (or via package.json: npm run cron:expire)
 *
 * Crontab example (run daily at 2 AM IST):
 *   0 2 * * * cd /app && npx tsx scripts/daily-expiry.ts >> /var/log/vajra-cron.log 2>&1
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, lt, sql } from "drizzle-orm";
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

// ─── Read config.yml ────────────────────────────────────────────────────────

function readConfig() {
  try {
    const configPath = resolve(__dirname, "..", "config.yml");
    const raw = readFileSync(configPath, "utf-8");

    const trialMatch = raw.match(/trial_period_days:\s*(\d+)/);
    const churnMatch = raw.match(/enquiry_churn_days:\s*(\d+)/);

    return {
      trialPeriodDays: trialMatch ? Number(trialMatch[1]) : 2,
      enquiryChurnDays: churnMatch ? Number(churnMatch[1]) : 30,
    };
  } catch {
    console.warn("⚠ Could not read config.yml, using defaults.");
    return { trialPeriodDays: 2, enquiryChurnDays: 30 };
  }
}

// ─── Minimal schema (just what the script needs) ────────────────────────────

const memberStatusEnum = pgEnum("member_status", [
  "ACTIVE",
  "EXPIRED",
  "PENDING_PAYMENT",
  "TRIAL",
  "ENQUIRY",
  "CHURNED",
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

  const config = readConfig();
  console.log(
    `  Config → trial_period_days: ${config.trialPeriodDays}, enquiry_churn_days: ${config.enquiryChurnDays}`
  );

  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  const db = drizzle(client);

  try {
    const now = new Date();

    // 1. ACTIVE → EXPIRED (expiry_date has passed)
    const expired = await db
      .update(members)
      .set({ status: "EXPIRED" })
      .where(and(eq(members.status, "ACTIVE"), lt(members.expiryDate, now)))
      .returning({ id: members.id, name: members.name });

    console.log(`  ✓ Marked ${expired.length} member(s) as EXPIRED.`);
    for (const m of expired) {
      console.log(`    → ${m.name} (${m.id})`);
    }

    // 2. TRIAL → PENDING_PAYMENT (trial period exhausted)
    const trialExpired = await db
      .update(members)
      .set({ status: "PENDING_PAYMENT" })
      .where(
        and(
          eq(members.status, "TRIAL"),
          sql`${members.createdAt} < NOW() - INTERVAL '${sql.raw(String(config.trialPeriodDays))} days'`
        )
      )
      .returning({ id: members.id, name: members.name });

    console.log(
      `  ✓ Moved ${trialExpired.length} TRIAL member(s) to PENDING_PAYMENT.`
    );
    for (const m of trialExpired) {
      console.log(`    → ${m.name} (${m.id})`);
    }

    // 3. ENQUIRY → CHURNED (no join within N days)
    const churned = await db
      .update(members)
      .set({ status: "CHURNED" })
      .where(
        and(
          eq(members.status, "ENQUIRY"),
          sql`${members.createdAt} < NOW() - INTERVAL '${sql.raw(String(config.enquiryChurnDays))} days'`
        )
      )
      .returning({ id: members.id, name: members.name });

    console.log(`  ✓ Marked ${churned.length} ENQUIRY member(s) as CHURNED.`);
    for (const m of churned) {
      console.log(`    → ${m.name} (${m.id})`);
    }

    const duration = Date.now() - started.getTime();
    console.log(
      `[${new Date().toISOString()}] Done in ${duration}ms. Totals: ${expired.length} expired, ${trialExpired.length} trial→pending, ${churned.length} churned.`
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Expiry worker FAILED:`, error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

main();
