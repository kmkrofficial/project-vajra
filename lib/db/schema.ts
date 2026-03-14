import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  uuid,
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
}));

export const branchRelations = relations(branches, ({ one, many }) => ({
  workspace: one(gymWorkspaces, {
    fields: [branches.workspaceId],
    references: [gymWorkspaces.id],
  }),
  assignedUsers: many(workspaceUsers),
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
