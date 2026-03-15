import { randomInt, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";
import cfg from "@/lib/config";

/**
 * OTP generation and verification service.
 *
 * OTPs are 6-digit numeric codes, hashed with scrypt before storage.
 * Default TTL: 15 minutes.
 *
 * @module lib/services/otp
 */

const SCRYPT_KEYLEN = 64;

/** Generate a cryptographically random 6-digit OTP. */
export function generateOtp(): string {
  return String(randomInt(100_000, 999_999));
}

/** Hash an OTP with a random salt. Returns "salt:hash" hex string. */
export function hashOtp(otp: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(otp, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

/** Constant-time comparison of a plain OTP against a "salt:hash" string. */
export function verifyOtp(otp: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derived = scryptSync(otp, salt, SCRYPT_KEYLEN);
    const storedBuf = Buffer.from(hash, "hex");
    if (derived.length !== storedBuf.length) return false;
    return timingSafeEqual(derived, storedBuf);
  } catch (err) {
    logger.error({ err, fn: "verifyOtp" }, "OTP verification error");
    return false;
  }
}

/** OTP expiry: configurable minutes from now (default from config.yml). */
export function otpExpiresAt(minutesFromNow = cfg.auth.otpTtlMinutes): Date {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

/** Invite token expiry: configurable hours from now (default from config.yml). */
export function inviteExpiresAt(hoursFromNow = cfg.auth.inviteTtlHours): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}
