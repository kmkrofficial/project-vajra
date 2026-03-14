import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  uuid,
  integer,
  varchar,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";

// ─── Auth Tables (Better-Auth) ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Multi-Tenant Tables ────────────────────────────────────────────────────

export const gymWorkspaces = pgTable("gym_workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  primaryBranchName: text("primary_branch_name").notNull(),
  ownerUpiId: text("owner_upi_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactPhone: text("contact_phone"),
  kioskPin: varchar("kiosk_pin", { length: 6 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "SUPER_ADMIN",
  "MANAGER",
  "RECEPTIONIST",
  "TRAINER",
]);

export const workspaceUsers = pgTable("workspace_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: workspaceRoleEnum("role").notNull().default("RECEPTIONIST"),
  assignedBranchId: uuid("assigned_branch_id").references(() => branches.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Plans, Members & Transactions ──────────────────────────────────────────

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  durationDays: integer("duration_days").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberStatusEnum = pgEnum("member_status", [
  "ACTIVE",
  "EXPIRED",
  "PENDING_PAYMENT",
]);

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  checkinPin: varchar("checkin_pin", { length: 4 }),
  status: memberStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentMethodEnum = pgEnum("payment_method", ["UPI", "CASH"]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "COMPLETED",
  "PENDING",
]);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("UPI"),
  status: transactionStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Employees & Attendance ─────────────────────────────────────────────────

export const employeeRoleEnum = pgEnum("employee_role", [
  "manager",
  "trainer",
  "receptionist",
]);

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "invited",
]);

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  role: employeeRoleEnum("role").notNull().default("receptionist"),
  status: employeeStatusEnum("status").notNull().default("invited"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const employeeAttendance = pgTable("employee_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  checkInLat: numeric("check_in_lat", { precision: 10, scale: 7 }).notNull(),
  checkInLng: numeric("check_in_lng", { precision: 10, scale: 7 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Configuration ──────────────────────────────────────────────────────────

export const configuration = pgTable("configuration", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").references(() => branches.id, {
    onDelete: "cascade",
  }),
  kioskPin: text("kiosk_pin"), // hashed — never plain text
  themeMode: varchar("theme_mode", { length: 20 }).notNull().default("system"),
  defaultPlanId: uuid("default_plan_id").references(() => plans.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => gymWorkspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ──────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspaceUsers: many(workspaceUsers),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const gymWorkspaceRelations = relations(gymWorkspaces, ({ many }) => ({
  branches: many(branches),
  workspaceUsers: many(workspaceUsers),
  plans: many(plans),
  members: many(members),
  transactions: many(transactions),
  auditLogs: many(auditLogs),
  configurations: many(configuration),
  employees: many(employees),
  employeeAttendance: many(employeeAttendance),
}));

export const branchRelations = relations(branches, ({ one, many }) => ({
  workspace: one(gymWorkspaces, {
    fields: [branches.workspaceId],
    references: [gymWorkspaces.id],
  }),
  assignedUsers: many(workspaceUsers),
  members: many(members),
  employees: many(employees),
  attendance: many(employeeAttendance),
}));

export const workspaceUserRelations = relations(workspaceUsers, ({ one }) => ({
  workspace: one(gymWorkspaces, {
    fields: [workspaceUsers.workspaceId],
    references: [gymWorkspaces.id],
  }),
  user: one(user, {
    fields: [workspaceUsers.userId],
    references: [user.id],
  }),
  assignedBranch: one(branches, {
    fields: [workspaceUsers.assignedBranchId],
    references: [branches.id],
  }),
}));

export const planRelations = relations(plans, ({ one, many }) => ({
  workspace: one(gymWorkspaces, {
    fields: [plans.workspaceId],
    references: [gymWorkspaces.id],
  }),
  transactions: many(transactions),
}));

export const memberRelations = relations(members, ({ one, many }) => ({
  workspace: one(gymWorkspaces, {
    fields: [members.workspaceId],
    references: [gymWorkspaces.id],
  }),
  branch: one(branches, {
    fields: [members.branchId],
    references: [branches.id],
  }),
  transactions: many(transactions),
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  workspace: one(gymWorkspaces, {
    fields: [transactions.workspaceId],
    references: [gymWorkspaces.id],
  }),
  member: one(members, {
    fields: [transactions.memberId],
    references: [members.id],
  }),
  plan: one(plans, {
    fields: [transactions.planId],
    references: [plans.id],
  }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(gymWorkspaces, {
    fields: [auditLogs.workspaceId],
    references: [gymWorkspaces.id],
  }),
  user: one(user, {
    fields: [auditLogs.userId],
    references: [user.id],
  }),
}));

export const configurationRelations = relations(configuration, ({ one }) => ({
  workspace: one(gymWorkspaces, {
    fields: [configuration.workspaceId],
    references: [gymWorkspaces.id],
  }),
  branch: one(branches, {
    fields: [configuration.branchId],
    references: [branches.id],
  }),
  defaultPlan: one(plans, {
    fields: [configuration.defaultPlanId],
    references: [plans.id],
  }),
}));

export const employeeRelations = relations(employees, ({ one, many }) => ({
  workspace: one(gymWorkspaces, {
    fields: [employees.workspaceId],
    references: [gymWorkspaces.id],
  }),
  branch: one(branches, {
    fields: [employees.branchId],
    references: [branches.id],
  }),
  user: one(user, {
    fields: [employees.userId],
    references: [user.id],
  }),
  attendance: many(employeeAttendance),
}));

export const employeeAttendanceRelations = relations(employeeAttendance, ({ one }) => ({
  workspace: one(gymWorkspaces, {
    fields: [employeeAttendance.workspaceId],
    references: [gymWorkspaces.id],
  }),
  branch: one(branches, {
    fields: [employeeAttendance.branchId],
    references: [branches.id],
  }),
  employee: one(employees, {
    fields: [employeeAttendance.employeeId],
    references: [employees.id],
  }),
}));
