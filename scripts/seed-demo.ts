#!/usr/bin/env tsx
/**
 * Demo Data Seed Script
 *
 * Populates the database with a large, realistic gym organisation spanning
 * 18 months: 5 branches, 10 plans (including branch-specific & inactive),
 * ~400 members across ALL 6 statuses (ACTIVE / EXPIRED / PENDING_PAYMENT /
 * TRIAL / ENQUIRY / CHURNED), transactions with seasonal variance, 20
 * employees (some with login-capable user accounts), kiosk configs with
 * varied settings, and 2000+ audit log entries.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts          # seed
 *   npx tsx scripts/seed-demo.ts --clean  # remove seeded data, then re-seed
 *   npx tsx scripts/seed-demo.ts --purge  # remove seeded data only
 *
 * All user accounts (owner + employees) share the same password: DemoPass123!
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

import { loadConfig } from "../lib/config";

const appCfg = loadConfig();

const DB_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/vajra_dev";

const WORKSPACE_NAME = "Vajra Iron Temple";
const OWNER_EMAIL = "demo-owner@vajra.local";
const OWNER_NAME = "Raj Patel";
const SHARED_PASSWORD = "DemoPass123!";
let PASSWORD_HASH: string; // assigned in main() via async hashPassword

// Time constants
const NOW = new Date();
const ONE_DAY = 86_400_000;
const EIGHTEEN_MONTHS_AGO = new Date(NOW.getTime() - 548 * ONE_DAY);

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

// Plans — includes branch-specific, inactive, and plans with descriptions
const PLANS: {
  name: string;
  price: number;
  days: number;
  description: string | null;
  active: boolean;
  branchIdx: number | null; // null = all branches
}[] = [
  { name: "Monthly Lite", price: 800, days: 30, description: "Basic gym access during off-peak hours (6 AM – 12 PM). No trainer support.", active: true, branchIdx: null },
  { name: "Monthly Standard", price: 1500, days: 30, description: "Full gym access all day. Includes one free fitness assessment per month.", active: true, branchIdx: null },
  { name: "Monthly Premium", price: 2500, days: 30, description: "All-day access + personal trainer sessions (2/week). Locker included.", active: true, branchIdx: null },
  { name: "Quarterly Standard", price: 4000, days: 90, description: "3-month commitment at a 11% discount. Full gym access.", active: true, branchIdx: null },
  { name: "Half-Yearly Premium", price: 7000, days: 180, description: "6-month premium plan with 2 free PT sessions per week and diet consultation.", active: true, branchIdx: null },
  { name: "Annual Ultimate", price: 12000, days: 365, description: "Our best value — 12 months unlimited access, priority booking, towel service, and 4 PT sessions per week.", active: true, branchIdx: null },
  { name: "Student Special", price: 600, days: 30, description: "Valid student ID required. Off-peak hours only (Mon–Fri 10 AM – 4 PM).", active: true, branchIdx: 0 }, // Koramangala only
  { name: "Couple Monthly", price: 2800, days: 30, description: "For two members. Must register together. 7% savings over individual monthly standard.", active: true, branchIdx: 1 }, // Indiranagar only
  { name: "Weekend Warrior", price: 500, days: 30, description: "Access only on Saturdays & Sundays. Great for casual fitness enthusiasts.", active: false, branchIdx: null }, // Discontinued
  { name: "Trial Week", price: 199, days: 7, description: "One-time trial for first-time visitors. Full access for 7 days.", active: true, branchIdx: null },
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
  "Kiran", "Shalini", "Dinesh", "Rita", "Manoj", "Sunita", "Ravi", "Komal",
  "Vikas", "Shruti", "Prakash", "Madhu", "Naveen", "Kavya", "Ramesh", "Seema",
];

const LAST_NAMES = [
  "Sharma", "Patel", "Reddy", "Nair", "Kumar", "Singh", "Gupta", "Iyer",
  "Joshi", "Verma", "Bhat", "Menon", "Rao", "Chopra", "Pillai", "Desai",
  "Mishra", "Shetty", "Kapoor", "Agarwal", "Kulkarni", "Hegde", "Thomas",
  "Shah", "Malhotra", "Saxena", "Bose", "Mukherjee", "Chauhan", "Trivedi",
  "Rathod", "Pandey", "Bansal", "Dutta", "Tiwari", "Ghosh", "Yadav", "Jain",
];

/** true = has a linkable auth user account. All accounts share SHARED_PASSWORD. */
const EMPLOYEE_NAMES = [
  // Managers — all have login accounts
  { name: "Vikrant Mehra", role: "manager" as const, email: "vikrant.mehra@vajra.local", phone: "9880022001", hasUser: true },
  { name: "Gopal Reddy", role: "manager" as const, email: "gopal.reddy@vajra.local", phone: "9880022005", hasUser: true },
  { name: "Megha Desai", role: "manager" as const, email: "megha.desai@vajra.local", phone: "9880022010", hasUser: true },
  // Receptionists — 3 with accounts, 2 without (invited only)
  { name: "Sita Rangan", role: "receptionist" as const, email: "sita.rangan@vajra.local", phone: "9880022002", hasUser: true },
  { name: "Lakshmi Iyer", role: "receptionist" as const, email: "lakshmi.iyer@vajra.local", phone: "9880022006", hasUser: true },
  { name: "Deepa Sharma", role: "receptionist" as const, email: "deepa.sharma@vajra.local", phone: "9880022008", hasUser: true },
  { name: "Anita Verma", role: "receptionist" as const, email: "anita.verma@vajra.local", phone: "9880022012", hasUser: false },
  { name: "Nandini Rao", role: "receptionist" as const, email: "nandini.rao@vajra.local", phone: "9880022016", hasUser: false },
  // Trainers — mixed
  { name: "Anil Kumar", role: "trainer" as const, email: "anil.kumar@vajra.local", phone: "9880022003", hasUser: true },
  { name: "Preethi Nair", role: "trainer" as const, email: "preethi.nair@vajra.local", phone: "9880022004", hasUser: true },
  { name: "Rajan Pillai", role: "trainer" as const, email: "rajan.pillai@vajra.local", phone: "9880022007", hasUser: false },
  { name: "Sunil Bhat", role: "trainer" as const, email: "sunil.bhat@vajra.local", phone: "9880022009", hasUser: true },
  { name: "Karthik Rao", role: "trainer" as const, email: "karthik.rao@vajra.local", phone: "9880022011", hasUser: false },
  { name: "Harish Menon", role: "trainer" as const, email: "harish.menon@vajra.local", phone: "9880022013", hasUser: true },
  { name: "Pooja Kulkarni", role: "trainer" as const, email: "pooja.kulkarni@vajra.local", phone: "9880022014", hasUser: false },
  { name: "Arjun Shetty", role: "trainer" as const, email: "arjun.shetty@vajra.local", phone: "9880022015", hasUser: false },
  // A few employees who left
  { name: "Ramesh Joshi", role: "trainer" as const, email: "ramesh.joshi@vajra.local", phone: "9880022017", hasUser: false, status: "left" as const },
  { name: "Sheetal Kapoor", role: "receptionist" as const, email: "sheetal.kapoor@vajra.local", phone: "9880022018", hasUser: false, status: "left" as const },
  // Invited but not yet accepted
  { name: "Rohan Trivedi", role: "trainer" as const, email: "rohan.trivedi@vajra.local", phone: "9880022019", hasUser: false, status: "invited" as const },
  { name: "Kavya Pandey", role: "receptionist" as const, email: "kavya.pandey@vajra.local", phone: "9880022020", hasUser: false, status: "invited" as const },
];

const WHATSAPP_TEMPLATE = `Hi {name} 👋

Your membership at {gym} is up for renewal.

💰 Amount: ₹{amount}
📲 Pay via UPI: {upiLink}

Renew now to keep your fitness streak going! 💪

— Team Vajra Iron Temple`;

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes("--clean");
  const shouldPurge = args.includes("--purge");

  const sql = postgres(DB_URL, { prepare: false });

  console.log("🔌 Connected to database");

  // Hash the shared password using Better-Auth–compatible scrypt params
  PASSWORD_HASH = await hashPassword(SHARED_PASSWORD);

  // ── Clean up existing demo data ──
  const [existingWs] = await sql`
    SELECT id FROM gym_workspaces WHERE name = ${WORKSPACE_NAME} LIMIT 1
  `;

  if (existingWs) {
    console.log(`🧹 Found existing "${WORKSPACE_NAME}" — deleting cascade...`);
    await sql`DELETE FROM gym_workspaces WHERE id = ${existingWs.id}`;
    console.log("   ✓ Cleaned up old demo data");
  }

  // Also clean up orphaned employee user accounts from previous seeds
  for (const emp of EMPLOYEE_NAMES) {
    if (emp.hasUser) {
      await sql`
        DELETE FROM "user" WHERE email = ${emp.email}
      `;
    }
  }

  if (shouldPurge) {
    console.log("🏁 Purge complete. Exiting.");
    await sql.end();
    process.exit(0);
  }

  if (!shouldClean && !shouldPurge && existingWs) {
    // Default run with existing data: re-seed
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create owner user (upsert)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n👤 Creating owner user...");
  const ownerId = randomUUID();
  const [ownerRow] = await sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${ownerId}, ${OWNER_NAME}, ${OWNER_EMAIL}, true, ${EIGHTEEN_MONTHS_AGO}, ${EIGHTEEN_MONTHS_AGO})
    ON CONFLICT (email) DO UPDATE SET name = ${OWNER_NAME}
    RETURNING id
  `;
  const ownerUserId = ownerRow.id as string;

  // Upsert account with password — update hash on re-seed so login always works
  await sql`
    INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (${randomUUID()}, ${ownerUserId}, 'credential', ${ownerUserId}, ${PASSWORD_HASH}, ${EIGHTEEN_MONTHS_AGO}, ${EIGHTEEN_MONTHS_AGO})
    ON CONFLICT (id) DO NOTHING
  `;
  // Force-update the password on the existing credential row (covers re-seed)
  await sql`
    UPDATE "account"
    SET password = ${PASSWORD_HASH}, updated_at = ${NOW}
    WHERE user_id = ${ownerUserId} AND provider_id = 'credential'
  `;
  console.log(`   ✓ Owner: ${OWNER_NAME} <${OWNER_EMAIL}> (password: ${SHARED_PASSWORD})`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create workspace (with WhatsApp template & UPI ID)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🏢 Creating workspace...");
  const [workspace] = await sql`
    INSERT INTO gym_workspaces (name, primary_branch_name, owner_upi_id, whatsapp_template, created_at, updated_at)
    VALUES (${WORKSPACE_NAME}, ${BRANCHES[0].name}, 'vajra.iron@oksbi', ${WHATSAPP_TEMPLATE}, ${EIGHTEEN_MONTHS_AGO}, ${NOW})
    RETURNING id
  `;
  const wsId = workspace.id as string;
  console.log(`   ✓ Workspace: ${WORKSPACE_NAME} (${wsId})`);
  console.log(`   ✓ WhatsApp template configured`);
  console.log(`   ✓ UPI ID: vajra.iron@oksbi`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create branches
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🏗️  Creating branches...");
  const branchIds: string[] = [];
  for (const b of BRANCHES) {
    const [row] = await sql`
      INSERT INTO branches (workspace_id, name, contact_phone, latitude, longitude, created_at)
      VALUES (${wsId}, ${b.name}, ${b.phone}, ${b.lat}, ${b.lng}, ${EIGHTEEN_MONTHS_AGO})
      RETURNING id
    `;
    branchIds.push(row.id as string);
    console.log(`   ✓ Branch: ${b.name}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Link owner as SUPER_ADMIN to primary branch
  // ══════════════════════════════════════════════════════════════════════════
  await sql`
    INSERT INTO workspace_users (workspace_id, user_id, role, assigned_branch_id, created_at)
    VALUES (${wsId}, ${ownerUserId}, 'SUPER_ADMIN', ${branchIds[0]}, ${EIGHTEEN_MONTHS_AGO})
  `;
  console.log(`   ✓ Owner linked as SUPER_ADMIN to ${BRANCHES[0].name}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create plans (including branch-specific & inactive)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📋 Creating plans...");
  const planRecords: { id: string; price: number; days: number; active: boolean; branchIdx: number | null }[] = [];
  for (const p of PLANS) {
    const branchId = p.branchIdx !== null ? branchIds[p.branchIdx] : null;
    const [row] = await sql`
      INSERT INTO plans (workspace_id, branch_id, name, description, price, duration_days, active, created_at)
      VALUES (${wsId}, ${branchId}, ${p.name}, ${p.description}, ${p.price}, ${p.days}, ${p.active}, ${EIGHTEEN_MONTHS_AGO})
      RETURNING id
    `;
    planRecords.push({ id: row.id as string, price: p.price, days: p.days, active: p.active, branchIdx: p.branchIdx });
    const scope = p.branchIdx !== null ? ` [${BRANCHES[p.branchIdx].name} only]` : "";
    const status = p.active ? "" : " (INACTIVE)";
    console.log(`   ✓ Plan: ${p.name} — ₹${p.price} / ${p.days}d${scope}${status}`);
  }
  // Active plans only (used for member assignment and transactions)
  const activePlanIds = planRecords.filter((p) => p.active);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Create configuration for each branch (with variety)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🖥️  Setting up branch configurations...");
  const configModes = ["system", "dark", "light", "system", "dark"]; // varied
  const checkoutFlags = [true, false, true, false, true]; // some on, some off
  for (let i = 0; i < branchIds.length; i++) {
    // Set the default plan for some branches (first 3 get the Monthly Standard)
    const defaultPlanId = i < 3 ? activePlanIds[1].id : null;
    await sql`
      INSERT INTO configuration (workspace_id, branch_id, checkout_enabled, theme_mode, default_plan_id, created_at, updated_at)
      VALUES (${wsId}, ${branchIds[i]}, ${checkoutFlags[i]}, ${configModes[i]}, ${defaultPlanId}, ${EIGHTEEN_MONTHS_AGO}, ${NOW})
    `;
    console.log(`   ✓ ${BRANCHES[i].name}: checkout=${checkoutFlags[i] ? "ON" : "OFF"}, theme=${configModes[i]}, defaultPlan=${defaultPlanId ? "Monthly Standard" : "none"}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Create employees (with auth user accounts for some, multi-branch)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n👥 Creating employees...");
  const employeeIds: string[] = [];

  for (let i = 0; i < EMPLOYEE_NAMES.length; i++) {
    const emp = EMPLOYEE_NAMES[i];
    const primaryBranch = branchIds[i % branchIds.length];
    const empStatus = (emp as { status?: string }).status ?? "active";
    let empUserId: string | null = null;

    // Create an auth user account for employees that have hasUser = true
    if (emp.hasUser) {
      const userId = randomUUID();
      const [userRow] = await sql`
        INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
        VALUES (${userId}, ${emp.name}, ${emp.email}, true, ${randomDate(EIGHTEEN_MONTHS_AGO, daysAgo(180))}, ${NOW})
        ON CONFLICT (email) DO UPDATE SET name = ${emp.name}
        RETURNING id
      `;
      empUserId = userRow.id as string;

      await sql`
        INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${randomUUID()}, ${empUserId}, 'credential', ${empUserId}, ${PASSWORD_HASH}, ${daysAgo(180)}, ${NOW})
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        UPDATE "account"
        SET password = ${PASSWORD_HASH}, updated_at = ${NOW}
        WHERE user_id = ${empUserId} AND provider_id = 'credential'
      `;

      // Link employee user to workspace with appropriate RBAC role
      const wsRole = emp.role === "manager" ? "MANAGER" : emp.role === "receptionist" ? "RECEPTIONIST" : "TRAINER";
      await sql`
        INSERT INTO workspace_users (workspace_id, user_id, role, assigned_branch_id, created_at)
        VALUES (${wsId}, ${empUserId}, ${wsRole}, ${primaryBranch}, ${daysAgo(180)})
      `;
    }

    const [empRow] = await sql`
      INSERT INTO employees (workspace_id, branch_id, user_id, name, email, phone, role, status, created_at)
      VALUES (${wsId}, ${primaryBranch}, ${empUserId}, ${emp.name}, ${emp.email}, ${emp.phone}, ${emp.role}, ${empStatus}, ${randomDate(EIGHTEEN_MONTHS_AGO, daysAgo(120))})
      RETURNING id
    `;
    employeeIds.push(empRow.id as string);

    const loginTag = emp.hasUser ? " [can login]" : "";
    const statusTag = empStatus !== "active" ? ` (${empStatus})` : "";
    console.log(`   ✓ ${emp.name} (${emp.role}) → ${BRANCHES[i % BRANCHES.length].name}${loginTag}${statusTag}`);
  }

  // ── 7b. Multi-branch assignments for some employees ──
  console.log("\n🔗 Assigning multi-branch employees...");
  // First, create primary branch assignments for all employees
  for (let i = 0; i < employeeIds.length; i++) {
    const primaryBranch = branchIds[i % branchIds.length];
    await sql`
      INSERT INTO employee_branches (employee_id, branch_id, created_at)
      VALUES (${employeeIds[i]}, ${primaryBranch}, ${daysAgo(120)})
    `;
  }
  // Managers get access to 2–3 branches
  let multiBranchCount = 0;
  for (let i = 0; i < EMPLOYEE_NAMES.length; i++) {
    const emp = EMPLOYEE_NAMES[i];
    if (emp.role === "manager") {
      const primaryBranchIdx = i % branchIds.length;
      const extraBranches = [1, 2].map((offset) => (primaryBranchIdx + offset) % branchIds.length);
      for (const bi of extraBranches) {
        await sql`
          INSERT INTO employee_branches (employee_id, branch_id, created_at)
          VALUES (${employeeIds[i]}, ${branchIds[bi]}, ${daysAgo(90)})
        `;
        multiBranchCount++;
      }
    }
    // Some trainers float between 2 branches
    if (emp.role === "trainer" && Math.random() < 0.4) {
      const primaryBranchIdx = i % branchIds.length;
      const secondBranch = (primaryBranchIdx + 1) % branchIds.length;
      await sql`
        INSERT INTO employee_branches (employee_id, branch_id, created_at)
        VALUES (${employeeIds[i]}, ${branchIds[secondBranch]}, ${daysAgo(60)})
      `;
      multiBranchCount++;
    }
  }
  console.log(`   ✓ ${multiBranchCount} extra branch assignments`);

  // ══════════════════════════════════════════════════════════════════════════
  // 8. Generate members across 18 months — ALL 6 statuses
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🏋️  Generating members...");

  type MemberStatus = "ACTIVE" | "EXPIRED" | "PENDING_PAYMENT" | "TRIAL" | "ENQUIRY" | "CHURNED";

  interface MemberRecord {
    id: string;
    branchId: string;
    name: string;
    phone: string;
    email: string | null;
    status: MemberStatus;
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

  // Monthly cohorts spanning 18 months — total ~400 members
  const monthCohorts = [
    { monthsAgo: 18, count: 6 },
    { monthsAgo: 17, count: 7 },
    { monthsAgo: 16, count: 8 },
    { monthsAgo: 15, count: 10 },
    { monthsAgo: 14, count: 10 },
    { monthsAgo: 13, count: 12 },
    { monthsAgo: 12, count: 14 },
    { monthsAgo: 11, count: 16 },
    { monthsAgo: 10, count: 18 },
    { monthsAgo: 9, count: 20 },
    { monthsAgo: 8, count: 22 },
    { monthsAgo: 7, count: 24 },
    { monthsAgo: 6, count: 26 },
    { monthsAgo: 5, count: 25 },
    { monthsAgo: 4, count: 28 },
    { monthsAgo: 3, count: 30 },
    { monthsAgo: 2, count: 35 },
    { monthsAgo: 1, count: 38 },
    { monthsAgo: 0, count: 40 },
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
      const branchIdx = randomBetween(0, branchIds.length - 1);
      const branchId = branchIds[branchIdx];
      const planIdx = randomBetween(0, activePlanIds.length - 1);
      const plan = activePlanIds[planIdx];
      const joinDate = randomDate(cohortStart, cohortEnd > NOW ? NOW : cohortEnd);

      // ~60% of members have an email
      const email = Math.random() < 0.6
        ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomBetween(1, 99)}@gmail.com`
        : null;

      // Determine member lifecycle status — ensure ALL statuses are represented
      let status: MemberStatus;
      let expiryDate: Date | null;

      if (cohort.monthsAgo === 0) {
        // Current month: diverse mix
        const roll = Math.random();
        if (roll < 0.10) {
          // ENQUIRY — walked in, showed interest, no plan yet
          status = "ENQUIRY";
          expiryDate = null;
        } else if (roll < 0.22) {
          // TRIAL — started free trial this month
          status = "TRIAL";
          expiryDate = null;
        } else if (roll < 0.35) {
          // PENDING_PAYMENT — signed up, waiting for payment
          status = "PENDING_PAYMENT";
          expiryDate = null;
        } else if (roll < 0.50) {
          // ACTIVE — expiring very soon (1–7 days) → shows up in "expiring soon"
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(1, 7));
        } else {
          // ACTIVE — healthy runway
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(8, plan.days));
        }
      } else if (cohort.monthsAgo === 1) {
        // Last month: mostly active, some expiring, fresh enquiries & trials
        const roll = Math.random();
        if (roll < 0.05) {
          status = "ENQUIRY";
          expiryDate = null;
        } else if (roll < 0.10) {
          status = "TRIAL";
          expiryDate = null;
        } else if (roll < 0.18) {
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(1, 15));
        } else if (roll < 0.28) {
          // Expiring in next few days
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(1, 7));
        } else {
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(8, plan.days));
        }
      } else if (cohort.monthsAgo <= 3) {
        // Recent months: active, some expired, some pending
        const roll = Math.random();
        if (roll < 0.15) {
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(1, 30));
        } else if (roll < 0.22) {
          status = "PENDING_PAYMENT";
          expiryDate = daysAgo(randomBetween(1, 20));
        } else if (roll < 0.30) {
          // Expiring soon
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(1, 7));
        } else {
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(10, plan.days));
        }
      } else if (cohort.monthsAgo <= 8) {
        // Mid-range: high churn, some renewals
        const roll = Math.random();
        if (roll < 0.35) {
          // Churned people who expired and never came back — mark CHURNED
          status = "CHURNED";
          expiryDate = daysAgo(randomBetween(60, 180));
        } else if (roll < 0.50) {
          // Expired but relatively recent
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(30, 120));
        } else if (roll < 0.60) {
          status = "PENDING_PAYMENT";
          expiryDate = daysAgo(randomBetween(10, 60));
        } else {
          // Renewed — still active (loyal)
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(10, plan.days));
        }
      } else {
        // Old cohorts (9-18 months): very high churn, few loyal members
        const roll = Math.random();
        if (roll < 0.40) {
          // Churned long ago
          status = "CHURNED";
          const monthsExpiredAgo = randomBetween(3, cohort.monthsAgo - 1);
          expiryDate = daysAgo(monthsExpiredAgo * 30);
        } else if (roll < 0.65) {
          // Expired
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(60, 300));
        } else if (roll < 0.70) {
          // Old enquiry that never converted
          status = "CHURNED";
          expiryDate = null;
        } else if (roll < 0.85) {
          // Renewed multiple times, still active (very loyal)
          status = "ACTIVE";
          expiryDate = daysFromNow(randomBetween(15, plan.days));
        } else {
          // Fell off after some time
          status = "EXPIRED";
          expiryDate = daysAgo(randomBetween(90, 400));
        }
      }

      const memberId = randomUUID();

      allMembers.push({
        id: memberId,
        branchId,
        name,
        phone,
        email,
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
      INSERT INTO members (id, workspace_id, branch_id, name, phone, email, checkin_pin, status, expiry_date, created_at)
      VALUES (${m.id}, ${wsId}, ${m.branchId}, ${m.name}, ${m.phone}, ${m.email},
              ${uniquePin()}, ${m.status}, ${m.expiryDate}, ${m.createdAt})
    `;
  }

  const statusCounts = allMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});
  console.log(`   ✓ ${totalMembers} members created`);
  console.log(`     ACTIVE: ${statusCounts["ACTIVE"] ?? 0} | EXPIRED: ${statusCounts["EXPIRED"] ?? 0} | PENDING: ${statusCounts["PENDING_PAYMENT"] ?? 0}`);
  console.log(`     TRIAL: ${statusCounts["TRIAL"] ?? 0} | ENQUIRY: ${statusCounts["ENQUIRY"] ?? 0} | CHURNED: ${statusCounts["CHURNED"] ?? 0}`);

  // ══════════════════════════════════════════════════════════════════════════
  // 9. Generate transactions spanning the past 18 months
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n💰 Generating transactions...");

  let txCount = 0;

  for (const m of allMembers) {
    // ENQUIRY and TRIAL don't have transactions, CHURNED enquiries neither
    if (m.status === "ENQUIRY" || m.status === "TRIAL") continue;
    if (m.status === "CHURNED" && m.expiryDate === null) continue;

    if (m.status === "PENDING_PAYMENT" && m.expiryDate === null) {
      // First-timers who never paid — create a PENDING transaction
      await sql`
        INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
        VALUES (${wsId}, ${m.id}, ${activePlanIds[m.planIdx].id}, ${activePlanIds[m.planIdx].price},
                ${pick(["UPI", "CASH"])}, 'PENDING', ${m.createdAt})
      `;
      txCount++;
      continue;
    }

    // Initial completed payment
    await sql`
      INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
      VALUES (${wsId}, ${m.id}, ${activePlanIds[m.planIdx].id}, ${activePlanIds[m.planIdx].price},
              ${pick(["UPI", "CASH"])}, 'COMPLETED', ${m.createdAt})
    `;
    txCount++;

    // Simulate renewals for active long-running members
    const daysSinceJoin = (NOW.getTime() - m.createdAt.getTime()) / ONE_DAY;
    const planDays = activePlanIds[m.planIdx].days;

    if (m.status === "ACTIVE" && daysSinceJoin > planDays * 1.2) {
      let renewalDate = new Date(m.createdAt.getTime() + planDays * ONE_DAY);
      while (renewalDate < NOW) {
        // Pick a plan for renewal (sometimes upgrade/downgrade)
        const renewalPlanIdx = Math.random() < 0.75 ? m.planIdx : randomBetween(0, activePlanIds.length - 1);
        const renewalPlan = activePlanIds[renewalPlanIdx];
        await sql`
          INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
          VALUES (${wsId}, ${m.id}, ${renewalPlan.id}, ${renewalPlan.price},
                  ${pick(["UPI", "CASH"])}, 'COMPLETED', ${renewalDate})
        `;
        txCount++;
        renewalDate = new Date(renewalDate.getTime() + renewalPlan.days * ONE_DAY);
      }
    }

    // Some expired/churned members had 1–2 renewals before dropping off
    if ((m.status === "EXPIRED" || m.status === "CHURNED") && daysSinceJoin > planDays * 1.5 && Math.random() < 0.4) {
      const renewalDate = new Date(m.createdAt.getTime() + planDays * ONE_DAY + randomBetween(0, 7) * ONE_DAY);
      if (renewalDate < NOW) {
        const renewalPlan = activePlanIds[m.planIdx];
        await sql`
          INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
          VALUES (${wsId}, ${m.id}, ${renewalPlan.id}, ${renewalPlan.price},
                  ${pick(["UPI", "CASH"])}, 'COMPLETED', ${renewalDate})
        `;
        txCount++;

        // ~25% of churned members had two renewals before leaving
        if (Math.random() < 0.25) {
          const secondRenewal = new Date(renewalDate.getTime() + renewalPlan.days * ONE_DAY + randomBetween(0, 5) * ONE_DAY);
          if (secondRenewal < NOW) {
            await sql`
              INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
              VALUES (${wsId}, ${m.id}, ${renewalPlan.id}, ${renewalPlan.price},
                      ${pick(["UPI", "CASH"])}, 'COMPLETED', ${secondRenewal})
            `;
            txCount++;
          }
        }
      }
    }

    // Some PENDING_PAYMENT members have an older COMPLETED tx (they had a plan before, now renewal is pending)
    if (m.status === "PENDING_PAYMENT" && m.expiryDate && Math.random() < 0.5) {
      await sql`
        INSERT INTO transactions (workspace_id, member_id, plan_id, amount, payment_method, status, created_at)
        VALUES (${wsId}, ${m.id}, ${activePlanIds[m.planIdx].id}, ${activePlanIds[m.planIdx].price},
                ${pick(["UPI", "CASH"])}, 'PENDING', ${new Date(m.expiryDate.getTime() + randomBetween(1, 5) * ONE_DAY)})
      `;
      txCount++;
    }
  }

  console.log(`   ✓ ${txCount} transactions generated`);

  // ══════════════════════════════════════════════════════════════════════════
  // 10. Generate attendance records (90 days)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📋 Generating attendance records...");

  interface AttendanceRecord {
    workspaceId: string;
    branchId: string;
    memberId: string;
    checkedInAt: Date;
    checkedOutAt: Date | null;
  }

  const attendanceRecords: AttendanceRecord[] = [];
  // Active + Trial members check in; also some recently expired before they expired
  const eligibleForAttendance = allMembers.filter((m) =>
    m.status === "ACTIVE" || m.status === "TRIAL"
  );
  const recentlyExpired = allMembers.filter(
    (m) => (m.status === "EXPIRED" || m.status === "CHURNED") && m.expiryDate && m.expiryDate > daysAgo(30)
  );

  // Generate realistic attendance over the past 90 days
  for (let daysAgoIdx = 0; daysAgoIdx < 90; daysAgoIdx++) {
    const day = new Date(NOW.getTime() - daysAgoIdx * ONE_DAY);
    day.setHours(0, 0, 0, 0);

    // Skip Sundays — gyms often closed
    if (day.getDay() === 0) continue;

    // Saturdays have lower attendance
    const isSaturday = day.getDay() === 6;

    // Each day, 40-70% of active members show up (30-50% on Saturdays)
    const baseRate = isSaturday ? 0.3 : 0.4;
    const showUpRate = baseRate + Math.random() * 0.3;

    const pool = daysAgoIdx < 30
      ? [...eligibleForAttendance, ...recentlyExpired.filter((m) => m.expiryDate! > day)]
      : eligibleForAttendance;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const attendees = shuffled.slice(0, Math.ceil(shuffled.length * showUpRate));

    for (const m of attendees) {
      // Skip if member hadn't joined yet
      if (m.createdAt > day) continue;

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
  const ATT_BATCH = 100;
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
  console.log(`   ✓ ${attendanceRecords.length} attendance records (90 days)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 11. Generate rich audit logs across the full 18-month timeline
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📝 Generating audit logs...");

  const auditEntries: {
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    createdAt: Date;
  }[] = [];

  // COMPLETE_ONBOARDING — once, at the very beginning
  auditEntries.push({
    userId: ownerUserId,
    action: "COMPLETE_ONBOARDING",
    entityType: "WORKSPACE",
    entityId: wsId,
    details: JSON.stringify({ gymName: WORKSPACE_NAME, branchName: BRANCHES[0].name }),
    createdAt: EIGHTEEN_MONTHS_AGO,
  });

  // WORKSPACE_SWITCHED — periodic workspace switches by owner
  for (let i = 0; i < 20; i++) {
    auditEntries.push({
      userId: ownerUserId,
      action: "WORKSPACE_SWITCHED",
      entityType: "WORKSPACE",
      entityId: wsId,
      details: JSON.stringify({}),
      createdAt: randomDate(EIGHTEEN_MONTHS_AGO, NOW),
    });
  }

  // CREATE_PLAN logs
  for (const p of PLANS) {
    auditEntries.push({
      userId: ownerUserId,
      action: "CREATE_PLAN",
      entityType: "PLAN",
      entityId: randomUUID(),
      details: JSON.stringify({ name: p.name, price: p.price, durationDays: p.days }),
      createdAt: randomDate(EIGHTEEN_MONTHS_AGO, daysAgo(500)),
    });
  }

  // UPDATE_PLAN — a few plan price changes
  for (let i = 0; i < 8; i++) {
    const p = pick(PLANS);
    auditEntries.push({
      userId: ownerUserId,
      action: "UPDATE_PLAN",
      entityType: "PLAN",
      entityId: randomUUID(),
      details: JSON.stringify({ name: p.name, oldPrice: p.price - 200, newPrice: p.price }),
      createdAt: randomDate(daysAgo(300), daysAgo(30)),
    });
  }

  // TOGGLE_PLAN — a couple of plan activate/deactivate events
  auditEntries.push({
    userId: ownerUserId,
    action: "TOGGLE_PLAN",
    entityType: "PLAN",
    entityId: randomUUID(),
    details: JSON.stringify({ name: "Weekend Warrior", active: false }),
    createdAt: daysAgo(120),
  });

  // ADD_MEMBER — for each member
  for (const m of allMembers) {
    auditEntries.push({
      userId: ownerUserId,
      action: "ADD_MEMBER",
      entityType: "MEMBER",
      entityId: m.id,
      details: JSON.stringify({ name: m.name, status: m.status, branch: BRANCHES[branchIds.indexOf(m.branchId)]?.name }),
      createdAt: m.createdAt,
    });
  }

  // MARK_PAID — for each completed transaction (sample ~40% of non-pending members)
  const paidMembers = allMembers.filter((m) => !["PENDING_PAYMENT", "ENQUIRY", "TRIAL"].includes(m.status));
  for (let i = 0; i < paidMembers.length; i++) {
    if (Math.random() > 0.4) continue;
    const m = paidMembers[i];
    auditEntries.push({
      userId: ownerUserId,
      action: "MARK_PAID",
      entityType: "TRANSACTION",
      entityId: m.id,
      details: JSON.stringify({ amount: activePlanIds[m.planIdx].price, method: pick(["UPI", "CASH"]) }),
      createdAt: new Date(m.createdAt.getTime() + randomBetween(0, 3) * ONE_DAY),
    });
  }

  // KIOSK_CHECKIN — 1500+ entries (heavy kiosk usage)
  const kioskEligible = allMembers.filter(
    (m) => m.status === "ACTIVE" || m.status === "TRIAL" ||
           (m.status === "EXPIRED" && Math.random() < 0.3) ||
           (m.status === "CHURNED" && Math.random() < 0.1)
  );
  for (let i = 0; i < 1500; i++) {
    const m = pick(kioskEligible);
    const maxDate = (m.status === "EXPIRED" || m.status === "CHURNED") && m.expiryDate
      ? m.expiryDate
      : NOW;
    const checkinDate = randomDate(
      new Date(Math.max(m.createdAt.getTime(), EIGHTEEN_MONTHS_AGO.getTime())),
      maxDate
    );
    auditEntries.push({
      userId: null, // kiosk entries have no user
      action: "KIOSK_CHECKIN",
      entityType: "MEMBER",
      entityId: m.id,
      details: JSON.stringify({ branchId: m.branchId }),
      createdAt: checkinDate,
    });
  }

  // KIOSK_CHECKOUT — ~300 entries (fewer than checkins)
  for (let i = 0; i < 300; i++) {
    const m = pick(kioskEligible.filter((x) => x.status === "ACTIVE"));
    if (!m) break;
    const checkoutDate = randomDate(
      new Date(Math.max(m.createdAt.getTime(), daysAgo(90).getTime())),
      NOW
    );
    auditEntries.push({
      userId: null,
      action: "KIOSK_CHECKOUT",
      entityType: "MEMBER",
      entityId: m.id,
      details: JSON.stringify({ branchId: m.branchId }),
      createdAt: checkoutDate,
    });
  }

  // EMPLOYEE_INVITED — for each employee
  for (let i = 0; i < EMPLOYEE_NAMES.length; i++) {
    const emp = EMPLOYEE_NAMES[i];
    auditEntries.push({
      userId: ownerUserId,
      action: "EMPLOYEE_INVITED",
      entityType: "EMPLOYEE",
      entityId: employeeIds[i],
      details: JSON.stringify({ name: emp.name, role: emp.role, email: emp.email }),
      createdAt: randomDate(EIGHTEEN_MONTHS_AGO, daysAgo(120)),
    });
  }

  // UPDATE_EMPLOYEE_ROLE — some role changes
  for (let i = 0; i < 8; i++) {
    const idx = randomBetween(0, EMPLOYEE_NAMES.length - 1);
    const emp = EMPLOYEE_NAMES[idx];
    auditEntries.push({
      userId: ownerUserId,
      action: "UPDATE_EMPLOYEE_ROLE",
      entityType: "EMPLOYEE",
      entityId: employeeIds[idx],
      details: JSON.stringify({ name: emp.name, oldRole: "receptionist", newRole: emp.role }),
      createdAt: randomDate(daysAgo(300), daysAgo(30)),
    });
  }

  // TOGGLE_CHECKOUT — configuration changes
  for (let i = 0; i < branchIds.length; i++) {
    auditEntries.push({
      userId: ownerUserId,
      action: "TOGGLE_CHECKOUT",
      entityType: "CONFIGURATION",
      entityId: branchIds[i],
      details: JSON.stringify({ branch: BRANCHES[i].name, enabled: checkoutFlags[i] }),
      createdAt: randomDate(daysAgo(180), daysAgo(10)),
    });
  }

  // UPDATE_WHATSAPP_TEMPLATE — owner set a custom template
  auditEntries.push({
    userId: ownerUserId,
    action: "UPDATE_WHATSAPP_TEMPLATE",
    entityType: "WORKSPACE",
    entityId: wsId,
    details: JSON.stringify({ hasTemplate: true }),
    createdAt: daysAgo(60),
  });

  // UPLOAD_UPI_QR — not actually uploading image data, just the audit event
  auditEntries.push({
    userId: ownerUserId,
    action: "UPLOAD_UPI_QR",
    entityType: "WORKSPACE",
    entityId: wsId,
    details: JSON.stringify({ hasImage: false }),
    createdAt: daysAgo(90),
  });

  // Sort audit entries chronologically for realistic ordering
  auditEntries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Batch insert audit logs
  const BATCH_SIZE = 100;
  for (let i = 0; i < auditEntries.length; i += BATCH_SIZE) {
    const batch = auditEntries.slice(i, i + BATCH_SIZE);
    await sql`
      INSERT INTO audit_logs ${sql(
        batch.map((e) => ({
          workspace_id: wsId,
          user_id: e.userId,
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

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  const employeesWithAccounts = EMPLOYEE_NAMES.filter((e) => e.hasUser).length;

  console.log("\n" + "═".repeat(64));
  console.log("🎉 SEED COMPLETE — Demo Organisation Ready!");
  console.log("═".repeat(64));
  console.log(`\n  Workspace:    ${WORKSPACE_NAME}`);
  console.log(`  Owner:        ${OWNER_NAME} <${OWNER_EMAIL}>`);
  console.log(`  Password:     ${SHARED_PASSWORD}  (same for ALL accounts)`);
  console.log(`  Branches:     ${BRANCHES.length}`);
  console.log(`  Plans:        ${PLANS.length} (${PLANS.filter((p) => p.active).length} active, ${PLANS.filter((p) => !p.active).length} inactive, ${PLANS.filter((p) => p.branchIdx !== null).length} branch-specific)`);
  console.log(`  Members:      ${totalMembers}`);
  console.log(`    ACTIVE:           ${statusCounts["ACTIVE"] ?? 0}`);
  console.log(`    EXPIRED:          ${statusCounts["EXPIRED"] ?? 0}`);
  console.log(`    PENDING_PAYMENT:  ${statusCounts["PENDING_PAYMENT"] ?? 0}`);
  console.log(`    TRIAL:            ${statusCounts["TRIAL"] ?? 0}`);
  console.log(`    ENQUIRY:          ${statusCounts["ENQUIRY"] ?? 0}`);
  console.log(`    CHURNED:          ${statusCounts["CHURNED"] ?? 0}`);
  console.log(`  Transactions: ${txCount}`);
  console.log(`  Attendance:   ${attendanceRecords.length} (90 days)`);
  console.log(`  Audit Logs:   ${auditEntries.length}`);
  console.log(`  Employees:    ${EMPLOYEE_NAMES.length} (${employeesWithAccounts} with login accounts)`);
  console.log(`\n  Login-capable employee accounts (password: ${SHARED_PASSWORD}):`);
  for (const emp of EMPLOYEE_NAMES.filter((e) => e.hasUser)) {
    console.log(`    • ${emp.name} <${emp.email}> (${emp.role})`);
  }
  console.log(`\n  Login at http://localhost:${appCfg.server.port}/login\n`);

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
