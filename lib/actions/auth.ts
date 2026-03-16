"use server";

import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { locales, type Locale } from "@/i18n/routing";
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
      headers: await headers(),
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
): Promise<ActionResult & { locale?: string }> {
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    logger.info({ action: "sign_in", email }, "User signed in successfully");

    // Read user's locale preference and set the NEXT_LOCALE cookie
    const rows = await db
      .select({ locale: userTable.locale })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);
    const userLocale = (rows[0]?.locale as Locale) ?? "en";

    const cookieStore = await cookies();
    cookieStore.set("NEXT_LOCALE", userLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return { success: true, locale: userLocale };
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

/**
 * Update the currently logged-in user's profile (name).
 */
export async function updateProfile(
  name: string
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.user) return { success: false, error: "Not authenticated" };

    const trimmed = name.trim();
    if (trimmed.length < 2) return { success: false, error: "Name must be at least 2 characters." };

    await auth.api.updateUser({
      body: { name: trimmed },
      headers: await headers(),
    });

    logger.info({ action: "update_profile", userId: session.user.id }, "Profile updated");
    return { success: true };
  } catch (error) {
    logger.error({ err: error, action: "update_profile" }, "Failed to update profile");
    if (error instanceof APIError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Update the authenticated user's preferred UI locale.
 * Persists to database only — the NEXT_LOCALE cookie is managed by
 * next-intl's router on the client side and signInUser on login.
 */
export async function updateUserLocale(
  locale: string
): Promise<ActionResult> {
  if (!locales.includes(locale as Locale)) {
    return { success: false, error: "Invalid locale." };
  }
  try {
    const session = await getSession();
    if (!session?.user) return { success: false, error: "Not authenticated" };

    await db
      .update(userTable)
      .set({ locale, updatedAt: new Date() })
      .where(eq(userTable.id, session.user.id));

    logger.info({ action: "update_locale", userId: session.user.id, locale }, "Locale updated");
    return { success: true };
  } catch (error) {
    logger.error({ err: error, action: "update_locale" }, "Failed to update locale");
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Get the current user's saved locale preference from the database.
 */
export async function getUserLocale(): Promise<string> {
  const session = await getSession();
  if (!session?.user) return "en";

  const rows = await db
    .select({ locale: userTable.locale })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  return rows[0]?.locale ?? "en";
}
