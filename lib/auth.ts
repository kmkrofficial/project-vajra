import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/services/email";
import { logger } from "@/lib/logger";

/**
 * Better-Auth server instance.
 *
 * - Uses Drizzle adapter backed by PostgreSQL for session storage.
 * - Email/password authentication enabled with password-reset support.
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
    async sendResetPassword({ user, url }) {
      const sent = await sendEmail({
        to: user.email,
        subject: "Reset your Vajra password",
        text: `Hi ${user.name},\n\nClick the link below to reset your password:\n${url}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password:</p><p><a href="${url}">Reset Password</a></p><p>This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
      if (!sent) {
        logger.error({ fn: "sendResetPassword", email: user.email }, "Failed to send password reset email");
      }
    },
  },
  plugins: [nextCookies()],
});

/** Inferred session type from the Better-Auth instance. Includes `user` and `session` objects. */
export type Session = typeof auth.$Infer.Session;
