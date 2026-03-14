import { z } from "zod";

/**
 * Shared Zod validation schemas for the application.
 * Indian phone: 10-digit starting with 6-9.
 */

/** 10-digit Indian mobile number starting with 6, 7, 8, or 9. */
export const indianPhoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number");

/** Standard email validation. */
export const emailSchema = z
  .string()
  .email("Enter a valid email address");

/** Email that can be omitted or left blank. */
export const optionalEmailSchema = z
  .string()
  .email("Enter a valid email address")
  .optional()
  .or(z.literal(""));

/** Optional 4-digit numeric kiosk check-in PIN. */
export const kioskPinSchema = z
  .string()
  .regex(/^\d{4}$/, "Kiosk PIN must be exactly 4 digits")
  .optional()
  .or(z.literal(""));

/** Complete member registration form schema — validated both client-side and in server actions. */
export const memberFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: indianPhoneSchema,
  email: optionalEmailSchema,
  kioskPin: kioskPinSchema,
  planId: z.string().uuid("Please select a plan"),
  branchId: z.string().uuid("No branch configured"),
});

export type MemberFormData = z.infer<typeof memberFormSchema>;
