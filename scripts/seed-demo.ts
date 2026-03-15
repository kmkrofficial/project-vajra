#!/usr/bin/env tsx
/**
 * Demo Data Seed Script
 *
 * Populates the database with a realistic gym organisation spanning the past
 * 12 months: 5 branches, 6 plans, ~180 members across various statuses
 * (ACTIVE / EXPIRED / PENDING_PAYMENT / churned), transactions with seasonal
 * variance, employees across branches, kiosk configs, and a rich audit-log
 * history. Designed to make dashboards and analytics look production-real.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts          # seed
 *   npx tsx scripts/seed-demo.ts --clean  # remove seeded data, then re-seed
 *   npx tsx scripts/seed-demo.ts --purge  # remove seeded data only
 *
 * The script is idempotent for the owner user (uses upsert by email).
 * It creates a deterministic workspace name ("Vajra Iron Temple") that can
 * be detected and wiped on subsequent runs.
 */

import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import postgres from "postgres";

// ─── Config ─────────────────────────────────────────────────────────────────

const DB_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/vajra_dev";

const WORKSPACE_NAME = "Vajra Iron Temple";
const OWNER_EMAIL = "demo-owner@vajra.local";
const OWNER_NAME = "Raj Patel";
let OWNER_PASSWORD_HASH: string; // assigned in main() via async hashPassword

// Time constants
const NOW = new Date();
const ONE_DAY = 86_400_000;
const ONE_YEAR_AGO = new Date(NOW.getTime() - 365 * ONE_DAY);

// ─── Cryptographic Helpers ──────────────────────────────────────────────────

/**
 * Hash a password using the same algorithm and parameters as Better-Auth.
 * Better-Auth uses @noble/hashes scrypt with N=16384, r=16, p=1, dkLen=64.
 * Using the same lib ensures hashes are verifiable at login time.
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${Buffer.from(key).toString("hex")}`;
}

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function randomPhone(): string {
  return `9${String(Math.floor(100000000 + Math.random() * 900000000)).slice(0, 9)}`;
}

// ─── Deterministic Random Helpers ───────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomDate(from: Date, to: Date): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
}

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * ONE_DAY);
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * ONE_DAY);
}

// ─── Static Data Definitions ────────────────────────────────────────────────

const BRANCHES = [
  { name: "Koramangala HQ", phone: "9880011001", lat: "12.9352273", lng: "77.6244602" },
  { name: "Indiranagar", phone: "9880011002", lat: "12.9783692", lng: "77.6408356" },
  { name: "HSR Layout", phone: "9880011003", lat: "12.9116170", lng: "77.6474090" },
  { name: "Whitefield", phone: "9880011004", lat: "12.9698196", lng: "77.7499721" },
  { name: "Jayanagar", phone: "9880011005", lat: "12.9308940", lng: "77.5838204" },
];

const PLANS = [
  { name: "Monthly Lite", price: 800, days: 30 },
  { name: "Monthly Standard", price: 1500, days: 30 },
  { name: "Monthly Premium", price: 2500, days: 30 },
  { name: "Quarterly Standard", price: 4000, days: 90 },
  { name: "Half-Yearly Premium", price: 7000, days: 180 },
  { name: "Annual Ultimate", price: 12000, days: 365 },
];

const FIRST_NAMES = [
  "Aarav", "Aditi", "Arjun", "Ananya", "Bhavesh", "Chitra", "Deepak", "Diya",
  "Eshan", "Fatima", "Gaurav", "Hina", "Ishaan", "Jaya", "Karan", "Lavanya",
  "Manish", "Mira", "Nikhil", "Neha", "Om", "Priya", "Rahul", "Riya",
  "Sanjay", "Sneha", "Tarun", "Uma", "Vikram", "Yamini", "Zubin", "Tanvi",
  "Aditya", "Pooja", "Rohan", "Kavita", "Suresh", "Anjali", "Varun", "Meera",
  "Harsh", "Simran", "Rajesh", "Divya", "Mohan", "Nisha", "Arun", "Swati",
  "Kunal", "Rekha", "Amit", "Pallavi", "Dev", "Sonal", "Ajay", "Tina",
  "Sachin", "Aparna", "Vivek", "Geeta", "Anand", "Lata", "Pankaj", "Rani",
];

const LAST_NAMES = [
  "Sharma", "Patel", "Reddy", "Nair", "Kumar", "Singh", "Gupta", "Iyer",
  "Joshi", "Verma", "Bhat", "Menon", "Rao", "Chopra", "Pillai", "Desai",
  "Mishra", "Shetty", "Kapoor", "Agarwal", "Kulkarni", "Hegde", "Thomas",
  "Shah", "Malhotra", "Saxena", "Bose", "Mukherjee", "Chauhan", "Trivedi",
];

const EMPLOYEE_NAMES = [
  { name: "Vikrant Mehra", role: "manager" as const, email: "vikrant.mehra@vajra.local", phone: "9880022001" },
  { name: "Sita Rangan", role: "receptionist" as const, email: "sita.rangan@vajra.local", phone: "9880022002" },
  { name: "Anil Kumar", role: "trainer" as const, email: "anil.kumar@vajra.local", phone: "9880022003" },
  { name: "Preethi Nair", role: "trainer" as const, email: "preethi.nair@vajra.local", phone: "9880022004" },
  { name: "Gopal Reddy", role: "manager" as const, email: "gopal.reddy@vajra.local", phone: "9880022005" },
  { name: "Lakshmi Iyer", role: "receptionist" as const, email: "lakshmi.iyer@vajra.local", phone: "9880022006" },
  { name: "Rajan Pillai", role: "trainer" as const, email: "rajan.pillai@vajra.local", phone: null },
  { name: "Deepa Sharma", role: "receptionist" as const, email: "deepa.sharma@vajra.local", phone: null },
  { name: "Sunil Bhat", role: "trainer" as const, email: "sunil.bhat@vajra.local", phone: "9880022009" },
  { name: "Megha Desai", role: "manager" as const, email: "megha.desai@vajra.local", phone: "9880022010" },
  { name: "Karthik Rao", role: "trainer" as const, email: "karthik.rao@vajra.local", phone: null },
  { name: "Anita Verma", role: "receptionist" as const, email: "anita.verma@vajra.local", phone: "9880022012" },
];

const AUDIT_ACTIONS = [
  { action: "ADD_MEMBER", entityType: "MEMBER" },
  { action: "MARK_PAID", entityType: "TRANSACTION" },
  { action: "CREATE_PLAN", entityType: "PLAN" },
  { action: "UPDATE_PLAN", entityType: "PLAN" },
  { action: "KIOSK_CHECKIN", entityType: "MEMBER" },
  { action: "TOGGLE_CHECKOUT", entityType: "CONFIGURATION" },
  { action: "UPDATE_EMPLOYEE_ROLE", entityType: "EMPLOYEE" },
];

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes("--clean");
  const shouldPurge = args.includes("--purge");

  const sql = postgres(DB_URL, { prepare: false });

  console.log("🔌 Connected to database");

  // Hash the owner password using Better-Auth–compatible scrypt params
  OWNER_PASSWORD_HASH = await hashPassword("DemoPass123!");

  // ── Clean up existing demo data ──
  const [existingWs] = await sql`
    SELECT id FROM gym_workspaces WHERE name = ${WORKSPACE_NAME} LIMIT 1
  `;

  if (existingWs) {
    console.log(`🧹 Found existing "${WORKSPACE_NAME}" — deleting cascade...`);
    await sql`DELETE FROM gym_workspaces WHERE id = ${existingWs.id}`;
    console.log("   ✓ Cleaned up old demo data");
  }

  if (shouldPurge) {
    console.log("🏁 Purge complete. Exiting.");
    await sql.end();
    process.exit(0);
  }

  if (!shouldClean && !shouldPurge && existingWs) {
    // Default run with existing data: re-seed
  }

  // ── 1. Create owner user (upsert) ──
  console.log("\n👤 Creating owner user...");
  const ownerId = randomUUID();
  const [ownerRow] = await sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${ownerId}, ${OWNER_NAME}, ${OWNER_EMAIL}, true, ${ONE_YEAR_AGO}, ${ONE_YEAR_AGO})
    ON CONFLICT (email) DO UPDATE SET name = ${OWNER_NAME}
    RETURNING id
  `;
  const ownerUserId = ownerRow.id as string;

  // Upsert account with password — update hash on re-seed so login always works
  await sql`
    INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (${randomUUID()}, ${ownerUserId}, 'credential', ${ownerUserId}, ${OWNER_PASSWORD_HASH}, ${ONE_YEAR_AGO}, ${ONE_YEAR_AGO})
    ON CONFLICT (id) DO NOTHING
  `;
  // Force-update the password on the existing credential row (covers re-seed)
  await sql`
    UPDATE "account"
    SET password = ${OWNER_PASSWORD_HASH}, updated_at = ${NOW}
    WHERE user_id = ${ownerUserId} AND provider_id = 'credential'
  `;
  console.log(`   ✓ Owner: ${OWNER_NAME} <${OWNER_EMAIL}> (password: DemoPass123!)`);

  // ── 2. Create workspace ──
  console.log("\n🏢 Creating workspace...");
  const [workspace] = await sql`
    INSERT INTO gym_workspaces (name, primary_branch_name, owner_upi_id, created_at, updated_at)
    VALUES (${WORKSPACE_NAME}, ${BRANCHES[0].name}, 'vajra.iron@oksbi', ${ONE_YEAR_AGO}, ${NOW})
    RETURNING id
  `;
  const wsId = workspace.id as string;
  console.log(`   ✓ Workspace: ${WORKSPACE_NAME} (${wsId})`);

  // ── 3. Create branches ──
  console.log("\n🏗️  Creating branches...");
  const branchIds: string[] = [];
  for (const b of BRANCHES) {
    const [row] = await sql`
      INSERT INTO branches (workspace_id, name, contact_phone, latitude, longitude, created_at)
      VALUES (${wsId}, ${b.name}, ${b.phone}, ${b.lat}, ${b.lng}, ${ONE_YEAR_AGO})
      RETURNING id
    `;
    branchIds.push(row.id as string);
    console.log(`   ✓ Branch: ${b.name}`);
  }

  // ── 4. Link owner as SUPER_ADMIN to primary branch ──
  await sql`
    INSERT INTO workspace_users (workspace_id, user_id, role, assigned_branch_id, created_at)
    VALUES (${wsId}, ${ownerUserId}, 'SUPER_ADMIN', ${branchIds[0]}, ${ONE_YEAR_AGO})
  `;
  console.log(`   ✓ Owner linked as SUPER_ADMIN to ${BRANCHES[0].name}`);

  // ── 5. Create plans ──
  console.log("\n📋 Creating plans...");
  const planIds: { id: string; price: number; days: number }[] = [];
  for (const p of PLANS) {
    const [row] = await sql`
      INSERT INTO plans (workspace_id, name, price, duration_days, active, created_at)
      VALUES (${wsId}, ${p.name}, ${p.price}, ${p.days}, true, ${ONE_YEAR_AGO})
      RETURNING id
    `;
    planIds.push({ id: row.id as string, price: p.price, days: p.days });
    console.log(`   ✓ Plan: ${p.name} — ₹${p.price} / ${p.days}d`);
  }

  // ── 6. Create configuration for each branch ──
  console.log("\n🖥️  Setting up branch configurations...");
  for (let i = 0; i < branchIds.length; i++) {
    await sql`
      INSERT INTO configuration (workspace_id, branch_id, checkout_enabled, theme_mode, created_at, updated_at)
      VALUES (${wsId}, ${branchIds[i]}, false, 'system', ${ONE_YEAR_AGO}, ${NOW})
    `;
    console.log(`   ✓ Config for ${BRANCHES[i].name}: checkout disabled (default)`);
  }

  // ── 7. Create employees distributed across branches ──
  console.log("\n👥 Creating employees...");
  for (let i = 0; i < EMPLOYEE_NAMES.length; i++) {
    const emp = EMPLOYEE_NAMES[i];
    const assignedBranch = branchIds[i % branchIds.length];
    await sql`
      INSERT INTO employees (workspace_id, branch_id, name, email, phone, role, status, created_at)
      VALUES (${wsId}, ${assignedBranch}, ${emp.name}, ${emp.email}, ${emp.phone}, ${emp.role}, 'active', ${randomDate(ONE_YEAR_AGO, daysAgo(180))})
    `;
    console.log(`   ✓ ${emp.name} (${emp.role}) <${emp.email}> → ${BRANCHES[i % BRANCHES.length].name}`);
  }

  // ── 8. Generate members across the entire past year ──
  console.log("\n🏋️  Generating members...");

  interface MemberRecord {
    id: string;
    branchId: string;
    name: string;
    phone: string;
    status: "ACTIVE" | "EXPIRED" | "PENDING_PAYMENT";
    createdAt: Date;
    expiryDate: Date | null;
    planIdx: number;
  }

  const allMembers: MemberRecord[] = [];
  const usedPins = new Set<string>();
  const usedPhones = new Set<string>();

  function uniquePin(): string {
    let pin: string;
    do { pin = randomPin(); } while (usedPins.has(pin));
    usedPins.add(pin);
    return pin;
  }

  function uniquePhone(): string {
    let phone: string;
    do { phone = randomPhone(); } while (usedPhones.has(phone));
    usedPhones.add(phone);
    return phone;
  }

  // We'll create members in monthly cohorts to simulate realistic gym growth
  // Month 1 (12 months ago): 8 members → Month 12 (current): ~25 members
  // Total: ~180 members with various lifecycles

  const monthCohorts = [
    { monthsAgo: 12, count: 8 },
    { monthsAgo: 11, count: 10 },
    { monthsAgo: 10, count: 12 },
    { monthsAgo: 9, count: 14 },
    { monthsAgo: 8, count: 13 },
    { monthsAgo: 7, count: 15 },
    { monthsAgo: 6, count: 18 },
    { monthsAgo: 5, count: 16 },
    { monthsAgo: 4, count: 20 },
    { monthsAgo: 3, count: 18 },
    { monthsAgo: 2, count: 22 },
    { monthsAgo: 1, count: 15 },
    { monthsAgo: 0, count: 10 },
  ];

  let totalMembers = 0;

  for (const cohort of monthCohorts) {
    const cohortStart = new Date(NOW.getFullYear(), NOW.getMonth() - cohort.monthsAgo, 1);
    const cohortEnd = new Date(NOW.getFullYear(), NOW.getMonth() - cohort.monthsAgo + 1, 0);

    for (let i = 0; i < cohort.count; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const phone = uniquePhone();
      const pin = uniquePin();
      const branchIdx = randomBetween(0, branchIds.length - 1);
      const branchId = branchIds[branchIdx];
      const planIdx = randomBetween(0, planIds.length - 1);
      const plan = planIds[planIdx];
      const joinDate = randomDate(cohortStart, cohortEnd > NOW ? NOW : cohortEnd);

      // Determine member lifecycle
      let status: "ACTIVE" | "EXPIRED" | "PENDING_PAYMENT";
      let expiryDate: Date | null;

      if (cohort.monthsAgo === 0) {
        // Current month: mix of active and pending
        if (Math.random() < 0.3) {
          status = "PENDING_PAYMENT";
          expiryDate = null;
        } else {
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(5, plan.days));
        }
      } else if (cohort.monthsAgo <= 2) {
        // Recent months: mostly active, some expiring soon
        if (Math.random() < 0.15) {
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(1, 20));
        } else if (Math.random() < 0.1) {
          // Expiring in next 7 days — shows up in "expiring soon"
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(1, 7));
        } else {
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(8, plan.days));
        }
      } else if (cohort.monthsAgo <= 5) {
        // Mid-range: mixed — some renewed (active), many churned (expired)
        const roll = Math.random();
        if (roll < 0.45) {
          // Churned — expired and didn't renew
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(30, 120));
        } else if (roll < 0.55) {
          status = "PENDING_PAYMENT";
          expiryDate = daysAgo(randomBetween(1, 30));
        } else {
          // Renewed — still active
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(10, plan.days));
        }
      } else {
        // Old cohorts: high churn, some loyal long-term active
        const roll = Math.random();
        if (roll < 0.6) {
          // Churned long ago
          status = "EXPIRED";
          const monthsExpiredAgo = randomBetween(2, cohort.monthsAgo - 1);
          expiryDate = daysAgo(monthsExpiredAgo * 30);
        } else if (roll < 0.75) {
          // Renewed multiple times, still active (loyal)
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(15, plan.days));
        } else {
          // Pending / fell off
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(60, 200));
        }
      }

      const memberId = randomUUID();

      allMembers.push({
        id: memberId,
        branchId,
        name,
        phone,
        status,
        createdAt: joinDate,
        expiryDate,
        planIdx,
      });

      totalMembers++;
    }
  }

  // Bulk insert members
  for (const m of allMembers) {
    await sql`
      INSERT INTO members (id, workspace_id, branch_id, name, phone, checkin_pin, status, expiry_date, created_at)
      VALUES (${m.id}, ${wsId}, ${m.branchId}, ${m.name}, ${m.phone},
              ${uniquePin()}, ${m.status}, ${m.expiryDate}, ${m.createdAt})
    `;
  }

  const activeCt = allMembers.filter((m) => m.status === "ACTIVE").length;
  const expiredCt = allMembers.filter((m) => m.status === "EXPIRED").length;
  const pendingCt = allMembers.filter((m) => m.status === "PENDING_PAYMENT").length;
  console.log(`   ✓ ${totalMembers} members created`);
  console.log(`     ACTIVE: ${activeCt} | EXPIRED: ${expiredCt} | PENDING: ${pendingCt}`);

  // ── 9. Generate transactions spanning the past year ──
  console.log("\n💰 Generating transactions...");

  let txCount = 0;

  // For each member, create their initial transaction on join
  for (const m of allMembers) {
    if (m.status === "PENDING_PAYMENT" && m.expiryDate === null) {
      // First-timers who never paid — create a PENDING transaction
      await sql`
        INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
        VALUES (${wsId}, ${m.id}, ${planIds[m.planIdx].id}, ${planIds[m.planIdx].price},
                ${pick(["UPI", "CASH"])}, 'PENDING', ${m.createdAt})
      `;
      txCount++;
      continue;
    }

    // Initial completed payment
    await sql`
      INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
      VALUES (${wsId}, ${m.id}, ${planIds[m.planIdx].id}, ${planIds[m.planIdx].price},
              ${pick(["UPI", "CASH"])}, 'COMPLETED', ${m.createdAt})
    `;
    txCount++;

    // Simulate renewals for active long-running members
    // If they joined > 2 months ago and are still ACTIVE, they likely renewed
    const daysSinceJoin = (NOW.getTime() - m.createdAt.getTime()) / ONE_DAY;
    const planDays = planIds[m.planIdx].days;

    if (m.status === "ACTIVE" && daysSinceJoin > planDays * 1.2) {
      // Generate renewal transactions
      let renewalDate = new Date(m.createdAt.getTime() + planDays * ONE_DAY);
      while (renewalDate < NOW) {
        // Pick a plan for renewal (sometimes upgrade/downgrade)
        const renewalPlanIdx = Math.random() < 0.8 ? m.planIdx : randomBetween(0, planIds.length - 1);
        const renewalPlan = planIds[renewalPlanIdx];

        await sql`
          INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
          VALUES (${wsId}, ${m.id}, ${renewalPlan.id}, ${renewalPlan.price},
                  ${pick(["UPI", "CASH"])}, 'COMPLETED', ${renewalDate})
        `;
        txCount++;
        renewalDate = new Date(renewalDate.getTime() + renewalPlan.days * ONE_DAY);
      }
    }

    // Some expired members also had one renewal before churning
    if (m.status === "EXPIRED" && daysSinceJoin > planDays * 1.5 && Math.random() < 0.35) {
      const renewalDate = new Date(m.createdAt.getTime() + planDays * ONE_DAY + randomBetween(0, 7) * ONE_DAY);
      if (renewalDate < NOW) {
        const renewalPlan = planIds[m.planIdx];
        await sql`
          INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
          VALUES (${wsId}, ${m.id}, ${renewalPlan.id}, ${renewalPlan.price},
                  ${pick(["UPI", "CASH"])}, 'COMPLETED', ${renewalDate})
        `;
        txCount++;
      }
    }
  }

  console.log(`   ✓ ${txCount} transactions generated`);

  // ── 9b. Generate attendance records ──
  console.log("\n📋 Generating attendance records...");

  interface AttendanceRecord {
    workspaceId: string;
    branchId: string;
    memberId: string;
    checkedInAt: Date;
    checkedOutAt: Date | null;
  }

  const attendanceRecords: AttendanceRecord[] = [];
  const activeForAttendance = allMembers.filter((m) => m.status === "ACTIVE");

  // Generate realistic attendance over the past 30 days
  for (let daysAgoIdx = 0; daysAgoIdx < 30; daysAgoIdx++) {
    const day = new Date(NOW.getTime() - daysAgoIdx * ONE_DAY);
    day.setHours(0, 0, 0, 0);

    // Skip Sundays — gyms often closed
    if (day.getDay() === 0) continue;

    // Each day, 40-70% of active members show up
    const showUpRate = 0.4 + Math.random() * 0.3;
    const shuffled = [...activeForAttendance].sort(() => Math.random() - 0.5);
    const attendees = shuffled.slice(0, Math.ceil(shuffled.length * showUpRate));

    for (const m of attendees) {
      // Morning rush (6-10), midday (11-14), evening rush (17-21)
      const timeSlot = Math.random();
      let hour: number;
      if (timeSlot < 0.35) {
        hour = randomBetween(6, 10); // morning
      } else if (timeSlot < 0.5) {
        hour = randomBetween(11, 14); // midday
      } else {
        hour = randomBetween(17, 21); // evening
      }

      const checkedInAt = new Date(day);
      checkedInAt.setHours(hour, randomBetween(0, 59), randomBetween(0, 59));

      // Session length: 45 min to 2.5 hours
      const sessionMinutes = randomBetween(45, 150);
      const checkedOutAt = new Date(checkedInAt.getTime() + sessionMinutes * 60_000);

      // For today, some members might still be at the gym (no checkout)
      const isToday = daysAgoIdx === 0;
      const stillHere = isToday && checkedOutAt > NOW;

      attendanceRecords.push({
        workspaceId: wsId,
        branchId: m.branchId,
        memberId: m.id,
        checkedInAt,
        checkedOutAt: stillHere ? null : checkedOutAt,
      });
    }
  }

  // Batch insert attendance
  const ATT_BATCH = 50;
  for (let i = 0; i < attendanceRecords.length; i += ATT_BATCH) {
    const batch = attendanceRecords.slice(i, i + ATT_BATCH);
    await sql`
      INSERT INTO attendance ${sql(
        batch.map((a) => ({
          workspace_id: a.workspaceId,
          branch_id: a.branchId,
          member_id: a.memberId,
          checked_in_at: a.checkedInAt,
          checked_out_at: a.checkedOutAt,
        }))
      )}
    `;
  }
  console.log(`   ✓ ${attendanceRecords.length} attendance records`);

  // ── 10. Generate audit logs across the year ──
  console.log("\n📝 Generating audit logs...");

  const auditEntries: {
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    createdAt: Date;
  }[] = [];

  // For each member: ADD_MEMBER audit log
  for (const m of allMembers) {
    auditEntries.push({
      action: "ADD_MEMBER",
      entityType: "MEMBER",
      entityId: m.id,
      details: JSON.stringify({ name: m.name, branch: BRANCHES[branchIds.indexOf(m.branchId)]?.name }),
      createdAt: m.createdAt,
    });
  }

  // MARK_PAID for completed transactions (sample — every 3rd member)
  for (let i = 0; i < allMembers.length; i += 3) {
    const m = allMembers[i];
    if (m.status !== "PENDING_PAYMENT") {
      auditEntries.push({
        action: "MARK_PAID",
        entityType: "TRANSACTION",
        entityId: m.id,
        details: JSON.stringify({ amount: planIds[m.planIdx].price, method: pick(["UPI", "CASH"]) }),
        createdAt: new Date(m.createdAt.getTime() + randomBetween(0, 2) * ONE_DAY),
      });
    }
  }

  // CREATE_PLAN logs (at workspace creation time)
  for (const p of PLANS) {
    auditEntries.push({
      action: "CREATE_PLAN",
      entityType: "PLAN",
      entityId: randomUUID(),
      details: JSON.stringify({ name: p.name, price: p.price }),
      createdAt: randomDate(ONE_YEAR_AGO, daysAgo(330)),
    });
  }

  // KIOSK_CHECKIN entries — simulate heavy kiosk usage (500+ entries across the year)
  const activeMembersForCheckins = allMembers.filter(
    (m) => m.status === "ACTIVE" || (m.status === "EXPIRED" && Math.random() < 0.3)
  );
  for (let i = 0; i < 500; i++) {
    const m = pick(activeMembersForCheckins);
    const checkinDate = randomDate(
      new Date(Math.max(m.createdAt.getTime(), ONE_YEAR_AGO.getTime())),
      m.status === "EXPIRED" && m.expiryDate ? m.expiryDate : NOW
    );
    auditEntries.push({
      action: "KIOSK_CHECKIN",
      entityType: "MEMBER",
      entityId: m.id,
      details: JSON.stringify({ branchId: m.branchId }),
      createdAt: checkinDate,
    });
  }

  // UPDATE_EMPLOYEE_ROLE logs
  for (let i = 0; i < 5; i++) {
    const emp = pick(EMPLOYEE_NAMES);
    auditEntries.push({
      action: "UPDATE_EMPLOYEE_ROLE",
      entityType: "EMPLOYEE",
      entityId: randomUUID(),
      details: JSON.stringify({ name: emp.name, oldRole: "receptionist", newRole: emp.role }),
      createdAt: randomDate(daysAgo(200), daysAgo(30)),
    });
  }

  // Batch insert audit logs (50 at a time for speed)
  const BATCH_SIZE = 50;
  for (let i = 0; i < auditEntries.length; i += BATCH_SIZE) {
    const batch = auditEntries.slice(i, i + BATCH_SIZE);
    await sql`
      INSERT INTO audit_logs ${sql(
        batch.map((e) => ({
          workspace_id: wsId,
          user_id: ownerUserId,
          action: e.action,
          entity_type: e.entityType,
          entity_id: e.entityId,
          details: e.details,
          created_at: e.createdAt,
        }))
      )}
    `;
  }
  console.log(`   ✓ ${auditEntries.length} audit log entries`);

  // ── Summary ──
  console.log("\n" + "═".repeat(60));
  console.log("🎉 SEED COMPLETE — Demo Organisation Ready!");
  console.log("═".repeat(60));
  console.log(`\n  Workspace:  ${WORKSPACE_NAME}`);
  console.log(`  Owner:      ${OWNER_NAME} <${OWNER_EMAIL}>`);
  console.log(`  Password:   DemoPass123!`);
  console.log(`  Branches:   ${BRANCHES.length}`);
  console.log(`  Plans:      ${PLANS.length}`);
  console.log(`  Members:    ${totalMembers} (Active: ${activeCt} | Expired: ${expiredCt} | Pending: ${pendingCt})`);
  console.log(`  TXs:        ${txCount}`);
  console.log(`  Attendance: ${attendanceRecords.length}`);
  console.log(`  Audit Logs: ${auditEntries.length}`);
  console.log(`  Employees:  ${EMPLOYEE_NAMES.length}`);
  console.log(`\n  Login at http://localhost:3000/login with the owner credentials above.\n`);

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
