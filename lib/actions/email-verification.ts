"use server";

import { db } from "@/lib/db";
import { verification, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateOtp, hashOtp, verifyOtp, otpExpiresAt } from "@/lib/services/otp";
import { sendEmail } from "@/lib/services/email";
import { getSession } from "@/lib/actions/auth";
import { logger } from "@/lib/logger";
import { randomUUID } from "node:crypto";
import cfg from "@/lib/config";

type ActionResult = { success: boolean; error?: string };

/**
 * Send an email verification OTP to the current user's email.
 * Stores the hashed OTP in the `verification` table.
 */
export async function sendVerificationOtpAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  if (session.user.emailVerified) {
    return { success: false, error: "Email is already verified." };
  }

  const email = session.user.email;
  if (!email) return { success: false, error: "No email on account." };

  try {
    const otp = generateOtp();
    const hashed = hashOtp(otp);
    const expires = otpExpiresAt(); // reads from config.yml

    // Delete previous OTP entries for this user
    await db
      .delete(verification)
      .where(eq(verification.identifier, `email-otp:${session.user.id}`));

    // Store hashed OTP
    await db.insert(verification).values({
      id: randomUUID(),
      identifier: `email-otp:${session.user.id}`,
      value: hashed,
      expiresAt: expires,
    });

    // Send the email
    await sendEmail({
      to: email,
      subject: "Verify your email — Vajra",
      text: [
        `Hi ${session.user.name ?? "there"},`,
        ``,
        `Your email verification code is: ${otp}`,
        ``,
        `This code expires in ${cfg.auth.otpTtlMinutes} minutes.`,
        ``,
        `— Vajra Gym Platform`,
      ].join("\n"),
      html: `
        <h2>Verify Your Email</h2>
        <p>Hi ${session.user.name ?? "there"},</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 16px; background: #f4f4f5; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${otp}
        </div>
        <p>This code expires in ${cfg.auth.otpTtlMinutes} minutes.</p>
      `,
    });

    logger.info(
      { action: "sendVerificationOtp", userId: session.user.id },
      "Verification OTP sent"
    );
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "sendVerificationOtp" }, "Failed to send verification OTP");
    return { success: false, error: "Failed to send verification code." };
  }
}

/**
 * Verify the email OTP and mark the user as email-verified.
 */
export async function verifyEmailOtpAction(otp: string): Promise<ActionResult> {
  if (!otp || !/^\d{6}$/.test(otp)) {
    return { success: false, error: "OTP must be 6 digits." };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  if (session.user.emailVerified) {
    return { success: false, error: "Email is already verified." };
  }

  try {
    // Find the stored OTP
    const [record] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, `email-otp:${session.user.id}`))
      .limit(1);

    if (!record) {
      return { success: false, error: "No verification code found. Please request a new one." };
    }

    if (record.expiresAt < new Date()) {
      // Clean up expired record
      await db.delete(verification).where(eq(verification.id, record.id));
      return { success: false, error: "Verification code expired. Please request a new one." };
    }

    // Verify the OTP
    if (!verifyOtp(otp, record.value)) {
      return { success: false, error: "Invalid verification code." };
    }

    // Mark user email as verified
    await db
      .update(user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    // Clean up the verification record
    await db.delete(verification).where(eq(verification.id, record.id));

    logger.info(
      { action: "verifyEmailOtp", userId: session.user.id },
      "Email verified successfully"
    );
    return { success: true };
  } catch (err) {
    logger.error({ err, action: "verifyEmailOtp" }, "Failed to verify email OTP");
    return { success: false, error: "Verification failed." };
  }
}
