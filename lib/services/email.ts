import { logger } from "@/lib/logger";

/**
 * Minimal SMTP email service using Nodemailer.
 *
 * Configuration via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * In development, emails are logged to console instead of sent unless
 * `DEV_EMAIL_ENABLED=true` is explicitly set.
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

const isDev = process.env.NODE_ENV !== "production";
const devEmailEnabled = process.env.DEV_EMAIL_ENABLED === "true";

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
 * Send an email. In development mode (without DEV_EMAIL_ENABLED=true),
 * the email content is logged to the console and the function returns true.
 *
 * @returns true if the email was sent (or logged in dev), false on error.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  // Development: log instead of sending unless explicitly enabled
  if (isDev && !devEmailEnabled) {
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
