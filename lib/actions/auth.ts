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

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
