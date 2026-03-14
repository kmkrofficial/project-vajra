# Project Vajra

A self-hosted B2B SaaS **Gym Operations Platform** built for independent gym owners in India. Manages members, subscriptions, payments (UPI deep links), kiosk check-ins, multi-branch operations, staff RBAC, analytics, and audit logging — all without any third-party cloud lock-in.

> **Philosophy:** Extreme speed on cheap Android devices. Heavy server-side rendering via React Server Components, minimal client JS, and a single self-hosted VPS deployment via Coolify/Nixpacks.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone & Install](#1-clone--install)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Start PostgreSQL](#3-start-postgresql)
  - [4. Push Database Schema](#4-push-database-schema)
  - [5. Seed Demo Data (Optional)](#5-seed-demo-data-optional)
  - [6. Run the Dev Server](#6-run-the-dev-server)
  - [Quick Start (Windows)](#quick-start-windows)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Multi-Tenancy & RBAC](#multi-tenancy--rbac)
- [Server Actions API Reference](#server-actions-api-reference)
- [Data Access Layer (DAL) Reference](#data-access-layer-dal-reference)
- [Middleware](#middleware)
- [Kiosk Mode](#kiosk-mode)
- [Payments & WhatsApp Notifications](#payments--whatsapp-notifications)
- [Analytics Engine](#analytics-engine)
- [Cron Jobs & Background Workers](#cron-jobs--background-workers)
- [Scripts](#scripts)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Security](#security)
- [License](#license)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (React 19), Turbopack, `output: "standalone"` |
| **Database** | PostgreSQL 16 (Docker for dev, self-hosted for prod) |
| **ORM** | Drizzle ORM with `postgres.js` driver |
| **Auth** | Better-Auth v1.5 with Drizzle adapter, email/password |
| **UI** | Tailwind CSS v4, shadcn/ui v4 (`@base-ui/react`), Lucide icons |
| **Validation** | Zod v4 |
| **Logging** | Pino (JSON in prod, pretty-printed in dev) |
| **Testing** | Playwright v1.58 (Chromium, E2E) |
| **Hosting** | Oracle VPS via Coolify (Nixpacks build) |

**Zero cloud lock-in:** No Vercel-specific APIs, no Edge functions, no `@vercel/*` packages. Standard Node.js only.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│                                                             │
│  app/               React Server Components (pages/layouts) │
│  ├── (auth)/        Login / Signup pages                    │
│  ├── (app)/app/     Dashboard, Members, Branches, etc.      │
│  ├── (app)/kiosk/   Full-screen kiosk check-in              │
│  └── api/auth/      Better-Auth API route                   │
│                                                             │
│  lib/actions/       Server Actions (mutations + RBAC)        │
│  lib/dal/           Data Access Layer (read queries)         │
│  lib/db/            Drizzle schema + connection              │
│  components/        UI components (shadcn/ui + features)     │
│  middleware.ts      Auth redirects (session cookie check)    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL 16                                              │
│  ├── user, session, account (Better-Auth)                   │
│  ├── gym_workspaces, branches, workspace_users              │
│  ├── plans, members, transactions                           │
│  ├── employees, configuration                               │
│  └── audit_logs                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key design principles:**
- Every DB query is scoped by `workspace_id` (application-level multi-tenancy)
- RBAC is enforced in Server Actions, not at the DB level
- Mutations go through `lib/actions/` (Server Actions)
- Reads go through `lib/dal/` (Data Access Layer)
- UI is separated into `components/ui/` (primitives) and `components/features/` (business logic)

---

## Prerequisites

- **Node.js** ≥ 20
- **Docker** & Docker Compose (for local PostgreSQL)
- **npm** (comes with Node.js)

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/kmkrofficial/project-vajra.git
cd project-vajra
npm install
```

### 2. Environment Variables

Copy the example file and fill in the secrets:

```bash
cp .env.example .env.local
```

**Required variables:**

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/vajra_dev` |
| `BETTER_AUTH_SECRET` | 32+ char random secret for session signing | _(generate one)_ |
| `BETTER_AUTH_URL` | Base URL of the running app | `http://localhost:3000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `NEXT_PUBLIC_APP_URL` | Public URL for the app | `http://localhost:3000` |

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start PostgreSQL

```bash
npm run db:up
```

This starts a `postgres:16-alpine` container on port `5432` with:
- **User:** `postgres`
- **Password:** `postgres`
- **Database:** `vajra_dev`
- **Data volume:** `.pgdata/` (gitignored)

To stop: `npm run db:down` · To wipe: `npm run db:clean`

### 4. Push Database Schema

Drizzle's `push` command syncs the TypeScript schema directly to the DB without generating migration files:

```bash
npm run db:push
```

To explore the DB visually:
```bash
npm run db:studio
```

### 5. Seed Demo Data (Optional)

Populate the database with a realistic gym organisation spanning 12 months of history:

```bash
npm run db:seed
```

This creates:
- **1 workspace** ("Vajra Iron Temple") with **5 branches** across Bangalore
- **6 pricing plans** (₹800–₹12,000)
- **~190 members** with realistic lifecycle (active, expired, churned, pending)
- **300+ transactions** with renewals
- **760+ audit log entries** (check-ins, payments, role changes)
- **12 employees** across branches
- **Kiosk configs** with hashed PINs per branch

**Login credentials:** `demo-owner@vajra.local` / `DemoPass123!`

The script is idempotent — running it again cleans up the old data and re-seeds.

```bash
npm run db:seed:clean   # explicit clean + re-seed
```

### 6. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page is public; sign up or use the seeded demo credentials.

### Quick Start (Windows)

A PowerShell script handles all of the above in one shot:

```powershell
.\scripts\start-dev.ps1
```

This starts Docker Postgres → kills stale Node processes → syncs the DB schema → launches the dev server.

---

## Project Structure

```
project-vajra/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (providers, fonts, Toaster)
│   ├── page.tsx                  # Public landing page (/)
│   ├── error.tsx                 # Error boundary
│   ├── global-error.tsx          # Global error boundary
│   ├── globals.css               # Tailwind v4 imports
│   ├── (auth)/                   # Auth route group (no sidebar)
│   │   ├── login/page.tsx        # /login
│   │   └── signup/page.tsx       # /signup
│   ├── (app)/                    # Authenticated route group
│   │   ├── onboarding/page.tsx   # /onboarding (first-time setup)
│   │   ├── workspaces/           # /workspaces (workspace picker)
│   │   ├── kiosk/                # /kiosk (full-screen check-in)
│   │   └── app/                  # /app/* (main application)
│   │       ├── layout.tsx        # Sidebar + TopBar + MobileNav
│   │       ├── dashboard/        # /app/dashboard
│   │       ├── members/          # /app/members
│   │       ├── branches/         # /app/branches
│   │       ├── employees/        # /app/employees
│   │       ├── analytics/        # /app/analytics
│   │       ├── audit-logs/       # /app/audit-logs
│   │       └── settings/         # /app/settings, /app/settings/plans,
│   │                             #   /app/settings/kiosk
│   └── api/auth/[...all]/        # Better-Auth catch-all API
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── features/                 # Business logic components
│   │   ├── add-member-sheet.tsx  # Add Member slide-over form
│   │   └── workspace-switcher.tsx# Workspace selection (dark-launched)
│   ├── layout/                   # Shell components
│   │   ├── app-sidebar.tsx       # Desktop sidebar navigation
│   │   ├── mobile-nav.tsx        # Bottom tab navigation
│   │   └── top-bar.tsx           # Top bar with user menu
│   └── providers/
│       └── workspace-provider.tsx# Client-side workspace context
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle ORM table definitions
│   │   └── index.ts              # Lazy-initialised DB connection
│   ├── actions/                  # Server Actions (see API Reference)
│   ├── dal/                      # Data Access Layer (see DAL Reference)
│   ├── auth.ts                   # Better-Auth configuration
│   ├── auth-client.ts            # Client-side auth helpers
│   ├── logger.ts                 # Pino logger (auto-redacts PII)
│   ├── workspace-cookie.ts       # Server-side workspace cookie reader
│   ├── whatsapp.ts               # wa.me link generator
│   ├── validations.ts            # Zod schemas (phone, email, PIN)
│   └── utils.ts                  # cn() — Tailwind class merger
├── scripts/
│   ├── seed-demo.ts              # Demo data seeder
│   ├── daily-expiry.ts           # Cron: mark expired members
│   ├── cleanup-audit.ts          # Cron: delete old audit logs
│   ├── backup-db.sh              # Cron: pg_dump + gzip + rotate
│   └── start-dev.ps1             # Windows dev startup
├── tests/e2e/                    # Playwright E2E test suite
├── middleware.ts                 # Auth route protection
├── docker-compose.yml            # Local PostgreSQL
├── drizzle.config.ts             # Drizzle Kit configuration
├── next.config.ts                # Next.js configuration
├── playwright.config.ts          # Playwright configuration
└── package.json
```

---

## Database Schema

All tables are defined in `lib/db/schema.ts` using Drizzle ORM. The schema uses PostgreSQL-native features: UUIDs, enums, JSONB, and timestamps.

### Entity Relationship Diagram

```
┌──────────┐     ┌───────────────┐     ┌──────────────────┐
│   user   │────<│ workspace_    │>────│  gym_workspaces  │
│ (auth)   │     │    users      │     │                  │
└──────────┘     └───────────────┘     └────────┬─────────┘
                        │                       │
                        │              ┌────────┼─────────┐
                        │              ▼        ▼         ▼
                 ┌──────┴──────┐  ┌────────┐ ┌──────┐ ┌──────────┐
                 │  branches   │  │ plans  │ │audit │ │configu-  │
                 └──┬──────┬───┘  └───┬────┘ │_logs │ │ration    │
                    │      │          │      └──────┘ └──────────┘
                    ▼      ▼          │
              ┌─────────┐ ┌─────────┐ │
              │employees│ │ members │<┤
              └─────────┘ └────┬────┘ │
                               │      │
                               ▼      ▼
                         ┌────────────────┐
                         │  transactions  │
                         └────────────────┘
```

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `user` | Better-Auth user accounts | `id (text PK)`, `name`, `email`, `email_verified` |
| `session` | Active sessions | `token`, `userId`, `expiresAt` |
| `account` | Auth credentials | `providerId`, `password` (hashed) |
| `gym_workspaces` | Tenant root | `name`, `primaryBranchName`, `ownerUpiId` |
| `branches` | Physical gym locations | `workspaceId`, `name`, `latitude`, `longitude` |
| `workspace_users` | User ↔ workspace membership | `userId`, `role` (enum), `assignedBranchId` |
| `plans` | Subscription tiers | `name`, `price` (INR), `durationDays`, `active` |
| `members` | Gym members | `name`, `phone`, `checkinPin`, `status` (enum), `expiryDate` |
| `transactions` | Payment records | `memberId`, `planId`, `amount`, `paymentMethod`, `status` |
| `employees` | Staff records | `name`, `role`, `branchId`, `userId` (optional link) |
| `configuration` | Per-branch settings | `kioskPin` (hashed), `themeMode`, `defaultPlanId` |
| `audit_logs` | Immutable event log | `action`, `entityType`, `entityId`, `details` (JSONB) |

### Enums

| Enum | Values |
|---|---|
| `workspace_role` | `SUPER_ADMIN`, `MANAGER`, `RECEPTIONIST`, `TRAINER` |
| `member_status` | `ACTIVE`, `EXPIRED`, `PENDING_PAYMENT` |
| `payment_method` | `UPI`, `CASH` |
| `transaction_status` | `COMPLETED`, `PENDING` |
| `employee_role` | `manager`, `trainer`, `receptionist` |
| `employee_status` | `active`, `invited` |

---

## Authentication

Authentication is handled by **Better-Auth v1.5** with a Drizzle adapter. All sessions are stored in PostgreSQL — no JWTs, no external auth providers.

**Configuration:** `lib/auth.ts`

```typescript
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});
```

**Flow:**
1. User signs up at `/signup` → `signUpUser()` server action
2. Better-Auth creates a `user` row + `account` row (with hashed password) + `session` row
3. A session cookie (`better-auth.session_token`) is set
4. All subsequent requests carry this cookie
5. Middleware (`middleware.ts`) reads the cookie to gate routes

---

## Multi-Tenancy & RBAC

### Multi-Tenancy Model

Every data entity belongs to a `workspace_id`. This is **application-level isolation**, not database-level RLS. Every DAL query and Server Action explicitly filters by `workspace_id`.

**Workspace selection flow:**
1. After login, the user is shown `/workspaces` — a list of gym orgs they belong to
2. Clicking a workspace writes a `vajra_active_workspace` cookie containing `{ workspaceId, branchId, role }`
3. All subsequent pages read this cookie (server-side via `getActiveWorkspace()`) to scope queries

### RBAC Roles

| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | Full access. Create branches, manage employees, change roles, view analytics, audit logs. Only role that can modify RBAC. |
| `MANAGER` | Create plans, set kiosk PIN, add employees. Can view analytics. Cannot create branches or change roles. |
| `RECEPTIONIST` | Add members, mark payments, use kiosk. Cannot view analytics, audit logs, branches, or settings. |
| `TRAINER` | Same as receptionist. Future: personal training tracking. |

**RBAC is enforced at two levels:**
1. **Server Actions** (`lib/actions/`) — each action checks `verifyWorkspaceMembership()` and rejects unauthorized roles
2. **UI** — sidebar navigation hides links based on the `role` from the workspace cookie. Admin-only routes (`/app/branches`, `/app/settings`, `/app/analytics`, `/app/audit-logs`) perform a server-side role check and `redirect("/app/dashboard")` if unauthorized.

---

## Server Actions API Reference

All server actions live in `lib/actions/`. They are imported directly into React Server Components and Client Components via `"use server"` directives. There are no REST API endpoints — the app uses Next.js Server Actions exclusively for mutations.

### Authentication — `lib/actions/auth.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `signUpUser` | `email`, `password`, `name` | `{ success, error? }` | Public | Register a new user via Better-Auth |
| `signInUser` | `email`, `password` | `{ success, error? }` | Public | Authenticate and create session |
| `signOutUser` | — | `void` | Session | Sign out and redirect to `/login` |
| `getSession` | — | `Session \| null` | Session | Get the current authenticated session |

### Onboarding — `lib/actions/onboarding.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `completeOnboarding` | `{ gymName, branchName, upiId, planName, planPrice }` | `{ success, error? }` | Session | Transactional first-time setup: creates workspace → branch → SUPER_ADMIN link → first plan → audit log. Rolls back entirely on failure. |

### Workspace — `lib/actions/workspace.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `switchWorkspaceAction` | `newWorkspaceId: string` | `{ success, error? }` | Workspace member | Verifies membership, updates the workspace cookie, and revalidates the layout |

### Members — `lib/actions/members.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `createMember` | `{ name, phone, email?, kioskPin?, planId, branchId }` | `{ success, data: { memberId, transactionId, upiString, amount } }` | Workspace member | Creates a member (PENDING_PAYMENT), generates a UPI deep-link string for payment collection |
| `markAsPaid` | `transactionId`, `durationDays` | `{ success, error? }` | Workspace member | Marks transaction as COMPLETED, sets member status to ACTIVE, computes expiry date |
| `fetchMembers` | — | `Member[]` | Workspace member | Lists all members in the active workspace |
| `fetchMember` | `memberId` | `Member \| null` | Workspace member | Get a single member by ID |

### Plans — `lib/actions/plans.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `createPlan` | `{ name, price, durationDays }` | `{ success, error? }` | **SUPER_ADMIN / MANAGER** | Create a new subscription plan |
| `togglePlan` | `planId`, `active` | `{ success, error? }` | **SUPER_ADMIN / MANAGER** | Enable or disable a plan |
| `fetchPlans` | — | `Plan[]` | Workspace member | Get all plans for the workspace |

### Branches — `lib/actions/branches.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `createBranchAction` | `{ name, contactPhone?, latitude?, longitude? }` | `{ success, error? }` | **SUPER_ADMIN only** | Create a new branch with optional GPS coordinates |

### Employees — `lib/actions/employees.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `addEmployeeAction` | `{ name, role, branchId }` | `{ success, error? }` | **SUPER_ADMIN / MANAGER** | Add an employee to a branch |
| `updateEmployeeRoleAction` | `employeeId`, `newRole` | `{ success, error? }` | **SUPER_ADMIN only** | Change an employee's role (with audit log) |

### Kiosk — `lib/actions/kiosk.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `setKioskPin` | `branchId`, `pin` | `{ success, error? }` | **SUPER_ADMIN / MANAGER** | Set the kiosk exit PIN (hashed with scrypt) |
| `verifyKioskExitPin` | `branchId`, `pin` | `{ success, error? }` | Workspace member | Verify exit PIN against the stored hash |
| `processKioskCheckin` | `pin`, `branchId` | `{ success, memberName } \| { success: false, error }` | Unauthenticated | Look up a member by 4-digit PIN; succeeds only for ACTIVE members |

### Settings — `lib/actions/settings.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `setupKioskPin` | `pin` (4–6 digits) | `{ success, error? }` | **SUPER_ADMIN / MANAGER** | Hash PIN with scrypt + random salt and store in configuration |
| `verifyKioskPin` | `pin` | `{ success, error? }` | Workspace member | Constant-time PIN verification against stored hash |

### Error Logging — `lib/actions/log-client-error.ts`

| Action | Parameters | Returns | Auth | Description |
|---|---|---|---|---|
| `logClientError` | `{ message, digest?, stack?, pathname? }` | `void` | None | Fire-and-forget client error logging to Pino |

---

## Data Access Layer (DAL) Reference

All read-only database queries live in `lib/dal/`. Every function explicitly scopes queries by `workspace_id`. All functions include Pino logging with performance timing.

### Analytics — `lib/dal/analytics.ts`

| Function | Signature | Description |
|---|---|---|
| `getActiveMemberCount` | `(workspaceId) → number` | Count members with status = ACTIVE |
| `getMonthlyRevenue` | `(workspaceId) → number` | Sum of COMPLETED transactions this calendar month |
| `getExpiringMemberCount` | `(workspaceId, days?) → number` | Members expiring within N days (default: 7) |
| `getRevenueByMonth` | `(workspaceId, months?) → { month, revenue }[]` | Monthly revenue breakdown for last N months (default: 6) |
| `getChurnCount` | `(workspaceId) → number` | Members expired in last 30 days (churn metric) |
| `getMoMGrowth` | `(workspaceId) → number \| null` | Month-over-month revenue growth percentage |
| `getWoWGrowth` | `(workspaceId) → number \| null` | Week-over-week revenue growth percentage |
| `getWorkspaceAnalytics` | `(workspaceId) → AnalyticsSnapshot` | Runs all above queries in parallel and returns a single object |

### Audit — `lib/dal/audit.ts`

| Function | Signature | Description |
|---|---|---|
| `insertAuditLog` | `(data) → void` | Fire-and-forget audit log insert (never throws) |
| `getAuditLogs` | `(workspaceId, limit?, actionFilter?) → AuditLogRow[]` | Fetch logs with user name join, ordered by recency |

### Config — `lib/dal/config.ts`

| Function | Signature | Description |
|---|---|---|
| `getWorkspaceConfig` | `(workspaceId, branchId?) → ConfigRow \| null` | Get config; tries branch-scoped first, falls back to workspace-level |
| `upsertWorkspaceConfig` | `(workspaceId, branchId, data) → ConfigRow` | Create or update a configuration row |

### Employees — `lib/dal/employees.ts`

| Function | Signature | Description |
|---|---|---|
| `getEmployees` | `(workspaceId) → Employee[]` | All employees with branch name join |
| `insertEmployee` | `(data) → employee` | Create a new employee record |
| `getEmployeeByUserId` | `(workspaceId, userId) → employee \| null` | Look up employee by their auth user ID |
| `updateEmployeeRole` | `(workspaceId, employeeId, newRole) → { oldRole } \| null` | Update role and return previous value |

### Members — `lib/dal/members.ts`

| Function | Signature | Description |
|---|---|---|
| `getMembers` | `(workspaceId) → member[]` | All members in the workspace |
| `getMemberById` | `(memberId, workspaceId) → member \| null` | Single member by ID (workspace-scoped) |
| `getMemberByPin` | `(pin, branchId) → member \| null` | Look up member by kiosk check-in PIN |
| `insertMember` | `(data) → member` | Create member with PENDING_PAYMENT status |
| `insertTransaction` | `(data) → transaction` | Create a pending transaction |
| `completeTransaction` | `(txId, workspaceId, durationDays) → { transaction, member } \| null` | Mark as completed, activate member, set expiry |
| `getTransactionById` | `(txId, workspaceId) → transaction \| null` | Get transaction by ID |
| `markExpiredMembers` | `() → number` | Global: mark all past-expiry ACTIVE members as EXPIRED |

### Plans — `lib/dal/plans.ts`

| Function | Signature | Description |
|---|---|---|
| `getPlans` | `(workspaceId) → plan[]` | All plans in the workspace |
| `getActivePlans` | `(workspaceId) → plan[]` | Only active plans |
| `getPlanById` | `(planId, workspaceId) → plan \| null` | Single plan by ID |
| `insertPlan` | `(data) → plan` | Create a new plan |
| `togglePlanActive` | `(planId, workspaceId, active) → plan \| null` | Toggle active/inactive |

### Workspace — `lib/dal/workspace.ts`

| Function | Signature | Description |
|---|---|---|
| `getUserWorkspaces` | `(userId) → workspace[]` | All workspaces a user belongs to, with their role |
| `getWorkspaceDetails` | `(workspaceId, userId) → details \| null` | Full workspace + branches + membership, null if unauthorized |
| `verifyWorkspaceMembership` | `(workspaceId, userId) → { role, assignedBranchId } \| null` | Lightweight "is this user in this workspace?" check |
| `createBranch` | `(workspaceId, data) → branch` | Create a new branch |
| `getBranches` | `(workspaceId) → branch[]` | All branches with coordinates |
| `getBranchKioskPin` | `(branchId, workspaceId) → string \| null` | Get the kiosk PIN for a branch |
| `setBranchKioskPin` | `(branchId, workspaceId, pin) → boolean` | Set/update a branch kiosk PIN |

---

## Middleware

**File:** `middleware.ts`

The middleware runs on every request (except static assets) and performs two checks:

1. **Authenticated user on public route** (`/login`, `/signup`) → redirect to `/workspaces`
2. **Unauthenticated user on protected route** (anything except `/`, `/login`, `/signup`) → redirect to `/login`

The middleware does **not** check workspace cookies — that's done at the page level in `app/(app)/app/layout.tsx`.

---

## Kiosk Mode

The kiosk is a full-screen, locked-down interface designed for a tablet mounted at the gym entrance. Members type their 4-digit PIN on a touch numpad to check in.

**Route:** `/kiosk`

### How it works:

1. **Admin sets an exit PIN** in `/app/settings/kiosk` (hashed with scrypt + random salt via `setupKioskPin`)
2. The kiosk page (`app/(app)/kiosk/page.tsx`) checks if a PIN is configured:
   - **Yes → renders `KioskNumpad`** — the full-screen check-in pad
   - **No → renders setup form** (admin) or "Not configured" (staff)
3. **Check-in flow:** Member types 4-digit PIN → `processKioskCheckin()` → look up by `checkin_pin` + `branch_id` → verify status is ACTIVE → show green "Welcome, [name]!" screen → auto-clear after 3 seconds
4. **Exit flow:** Hidden button (top-right, `opacity-0`) → enter staff exit PIN → `verifyKioskPin()` → redirect to `/app/dashboard`
5. Physical keyboard support: digits, Backspace, Enter

### Security notes:
- The kiosk exit PIN is stored as a scrypt hash (64-byte key, random 16-byte salt)
- PIN verification uses constant-time comparison (`timingSafeEqual`) to prevent timing attacks
- The member check-in PIN (`checkin_pin`) is stored as plain text (4 digits, not a secret — it's a convenience code)

---

## Payments & WhatsApp Notifications

### UPI Payments

Vajra generates standard `upi://pay` deep links — **no payment gateway, no third-party API.**

When a member is created via `createMember()`:
1. A `PENDING` transaction is inserted
2. A UPI string is generated: `upi://pay?pa={owner_upi_id}&pn={gym_name}&am={amount}&cu=INR`
3. The frontend renders a QR code (via `qrcode.react`) and the raw UPI link
4. After the gym owner confirms payment, they click "Mark as Paid" → `markAsPaid()` → transaction status = COMPLETED, member status = ACTIVE

### WhatsApp Renewal Reminders

**File:** `lib/whatsapp.ts`

The `generateWhatsAppLink()` function creates `wa.me` deep links with pre-filled renewal messages:

```
https://wa.me/919876543210?text=Hi%20John%2C%20your%20membership%20expires%20soon...
```

Indian phone numbers are auto-formatted to include the `91` country code.

---

## Analytics Engine

**Route:** `/app/analytics` (SUPER_ADMIN & MANAGER only)

The analytics dashboard is powered by `lib/dal/analytics.ts`. All queries run in parallel via `getWorkspaceAnalytics()`.

### KPI Cards:
- **Active Members** — count of members with `status = 'ACTIVE'`
- **Monthly Revenue** — sum of COMPLETED transactions this calendar month
- **Expiring in 7 Days** — members whose `expiry_date` is within the next week
- **Churned (30d)** — members who expired in the last 30 days

### Growth Indicators:
- **MoM Growth** — `((this_month_revenue - last_month_revenue) / last_month_revenue) × 100`
- **WoW Growth** — same formula, 7-day windows

### Revenue Chart:
- Last 6 months of revenue, grouped by month (pure CSS bar chart — **no chart library**)

### Donut Chart:
- Member status distribution rendered with CSS `conic-gradient` — **no chart library**

---

## Cron Jobs & Background Workers

These scripts run as standalone Node.js processes via Linux crontab on the VPS. They are **not** Next.js API routes or serverless functions.

### Member Expiration — `scripts/daily-expiry.ts`

```bash
npm run cron:expire
# or: npx tsx scripts/daily-expiry.ts
```

- Runs: **Daily at 2 AM IST** (recommended)
- Marks all ACTIVE members with a past `expiry_date` as EXPIRED
- Logs each expired member ID and name
- Standalone: uses its own minimal Drizzle schema and direct `postgres` connection

**Crontab:**
```
0 2 * * * cd /app && npx tsx scripts/daily-expiry.ts >> /var/log/vajra-cron.log 2>&1
```

### Audit Log Cleanup — `scripts/cleanup-audit.ts`

```bash
npm run cron:cleanup-audit
# or: npx tsx scripts/cleanup-audit.ts
```

- Runs: **Weekly on Sunday at 3 AM IST** (recommended)
- Permanently deletes audit log entries older than 6 months
- Keeps the `audit_logs` table at a manageable size

**Crontab:**
```
0 3 * * 0 cd /app && npx tsx scripts/cleanup-audit.ts >> /var/log/vajra-audit-cleanup.log 2>&1
```

### Database Backup — `scripts/backup-db.sh`

```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

- Creates a `pg_dump | gzip` backup to `/var/backups/vajra/`
- Auto-deletes backups older than 14 days (configurable via `BACKUP_RETAIN`)

**Crontab:**
```
0 3 * * * /app/scripts/backup-db.sh >> /var/log/vajra-backup.log 2>&1
```

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `start-dev.ps1` | `.\scripts\start-dev.ps1` | Windows one-shot: Docker up → kill stale Node → DB push → dev server |
| `seed-demo.ts` | `npm run db:seed` | Seed 12 months of realistic demo data (idempotent) |
| `daily-expiry.ts` | `npm run cron:expire` | Mark expired members as EXPIRED |
| `cleanup-audit.ts` | `npm run cron:cleanup-audit` | Delete audit logs older than 6 months |
| `backup-db.sh` | `./scripts/backup-db.sh` | pg_dump + gzip with rotation |

---

## Testing

All E2E tests live in `tests/e2e/` and run with **Playwright** (Chromium).

### Run tests:

```bash
# Start dev server + run tests (Playwright auto-starts the server)
npm run test:e2e

# Or, with the server already running:
npx playwright test

# With visual UI:
npx playwright test --ui
```

### Test suite (32 tests):

| File | Tests | Coverage |
|---|---|---|
| `auth.spec.ts` | 3 | Sign up, sign in, invalid credentials |
| `workspace.spec.ts` | 3 | Login redirect, workspace list, dashboard redirect |
| `navigation.spec.ts` | 5 | Sidebar links, staff RBAC, FABs, top bar, route guards |
| `owner-revenue.spec.ts` | 1 | Full flow: create plan → add member → UPI QR → mark paid |
| `member-lifecycle.spec.ts` | 1 | Add member with auto-PIN, privacy modal, WhatsApp button |
| `kiosk-flow.spec.ts` | 2 | PIN check-in success, exit button flow |
| `staff-kiosk.spec.ts` | 3 | RBAC visibility, kiosk success, expired PIN error |
| `analytics-kiosk-pin.spec.ts` | 4 | Analytics RBAC, kiosk PIN setup, kiosk exit with PIN |
| `hrms-rbac.spec.ts` | 1 | Create branch → add employee → inline role change |
| `owner-intelligence.spec.ts` | 4 | Receptionist blocks, analytics KPIs, audit logs, filter |
| `cron-expiry.spec.ts` | 1 | Cron SQL logic: expired vs active vs pending |
| Landing page tests | 4 | Hero CTAs, navigation links |

### Test architecture:
- Each test file signs up a fresh user via the UI, then seeds workspace data directly in PostgreSQL via `tests/e2e/helpers.ts`
- The `helpers.ts` file provides: `getTestDb()`, `seedWorkspaceForUser()`, `addStaffToWorkspace()`, `seedMember()`, `cleanupTestData()`
- Tests clean up after themselves in `afterAll` hooks

---

## Production Deployment

Vajra is deployed on an **Oracle VPS via Coolify** using Nixpacks. There is no Dockerfile — Nixpacks detects the Next.js app and builds it automatically.

### Build:

```bash
npm run build
# This runs: drizzle-kit push && next build
# Outputs a standalone Node.js server in .next/standalone/
```

### Environment setup:

1. Set `DATABASE_URL` to your production PostgreSQL instance
2. Set `BETTER_AUTH_SECRET` to a random 32+ character string
3. Set `BETTER_AUTH_URL` to your production domain (e.g., `https://vajra.example.com`)
4. Set `NODE_ENV=production`

### Post-deploy:

1. Set up the three crontab entries (expiry, audit cleanup, backup)
2. Run `npm run db:seed` once if you want demo data

### Security headers (applied via `next.config.ts`):

| Header | Value |
|---|---|
| `X-DNS-Prefetch-Control` | `on` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `origin-when-cross-origin` |

---

## Security

- **Sessions:** Server-side PostgreSQL sessions via Better-Auth. No JWTs.
- **Passwords:** Hashed by Better-Auth (scrypt internally). Never logged.
- **Kiosk PINs:** scrypt + random 16-byte salt, constant-time comparison (`timingSafeEqual`)
- **Sensitive logging:** Pino automatically redacts `password`, `token`, `pin`, `cookie` fields
- **CSRF:** Next.js Server Actions include built-in CSRF protection
- **Multi-tenancy:** Every query scoped by `workspace_id` — no RLS, enforced at application layer
- **Error boundaries:** `error.tsx` and `global-error.tsx` catch all rendering errors; client errors are logged to the server via `logClientError()`
- **Security headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

---

## License

Private — all rights reserved.
