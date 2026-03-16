import { logger } from "@/lib/logger";
import { loadConfig } from "@/lib/config";

/**
 * Minimal SMTP email service using Nodemailer.
 *
 * Configuration via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * In development (when `dev.email_enabled: 0` in config.yml),
 * emails are logged to console instead of sent.
 *
 * @module lib/services/email
 */

interface EmailPayload {
  to: string;
  subject: string;
  /** Plain text body */
  text: string;
  /** Optional HTML body */
  html?: string;
}

/**
 * Dynamically import nodemailer only when needed (keeps the client bundle clean).
 * Returns null if nodemailer is not installed.
 */
async function getTransporter() {
  try {
    const nodemailer = await import("nodemailer");
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Send an email. When `dev.email_enabled` is false in config.yml,
 * the email content is logged to the console and the function returns true.
 *
 * @returns true if the email was sent (or logged in dev), false on error.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const cfg = loadConfig();

  if (!cfg.dev.emailEnabled) {
    logger.info(
      {
        fn: "sendEmail",
        to: payload.to,
        subject: payload.subject,
        devMode: true,
      },
      `[DEV EMAIL] To: ${payload.to} | Subject: ${payload.subject}\n${payload.text}`
    );
    return true;
  }

  const from = process.env.SMTP_FROM ?? "noreply@vajra.local";

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      logger.error(
        { fn: "sendEmail" },
        "Nodemailer not available. Install it with `npm i nodemailer`."
      );
      return false;
    }

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    logger.info(
      { fn: "sendEmail", to: payload.to, subject: payload.subject },
      "Email sent successfully"
    );
    return true;
  } catch (err) {
    logger.error(
      { err, fn: "sendEmail", to: payload.to },
      "Failed to send email"
    );
    return false;
  }
}
