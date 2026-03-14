"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { logger } from "@/lib/logger";

type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Register a new user account via Better-Auth email/password.
 * @param email - The user's email address.
 * @param password - Plain-text password (hashed by Better-Auth internally).
 * @param name - Display name.
 * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
 */
export async function signUpUser(
  email: string,
  password: string,
  name: string
): Promise<ActionResult> {
  try {
    await auth.api.signUpEmail({
      body: { email, password, name },
    });
    logger.info({ action: "sign_up", email }, "User signed up successfully");
    return { success: true };
  } catch (error) {
    logger.error({ err: error, action: "sign_up", email }, "Failed to sign up user");
    if (error instanceof APIError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Authenticate an existing user and create a server-side session.
 * The session cookie is set automatically by Better-Auth via the `nextCookies()` plugin.
 * @param email - The user's email address.
 * @param password - Plain-text password to verify.
 * @returns `{ success: true }` on success, or `{ success: false, error }` on failure.
 */
export async function signInUser(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    logger.info({ action: "sign_in", email }, "User signed in successfully");
    return { success: true };
  } catch (error) {
    logger.error({ err: error, action: "sign_in", email }, "Failed to sign in user");
    if (error instanceof APIError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Sign out the current user, destroy the session, and redirect to `/login`.
 * Errors are logged but never thrown — the redirect always happens.
 */
export async function signOutUser(): Promise<void> {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
    logger.info({ action: "sign_out" }, "User signed out");
  } catch (error) {
    logger.error({ err: error, action: "sign_out" }, "Sign out error (non-blocking)");
  }
  redirect("/login");
}

/**
 * Retrieve the current authenticated session from the request cookies.
 * @returns The Better-Auth session object, or `null` if not authenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
