import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

/**
 * Better-Auth server instance.
 *
 * - Uses Drizzle adapter backed by PostgreSQL for session storage.
 * - Email/password authentication enabled.
 * - `nextCookies()` plugin auto-sets session cookies in Next.js responses.
 *
 * @see https://better-auth.com
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});

/** Inferred session type from the Better-Auth instance. Includes `user` and `session` objects. */
export type Session = typeof auth.$Infer.Session;
