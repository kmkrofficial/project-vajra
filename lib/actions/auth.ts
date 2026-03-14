"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

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
    return { success: true };
  } catch (error) {
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
    return { success: true };
  } catch (error) {
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
  } catch {
    // Silently handle signout errors — user is redirected regardless.
  }
  redirect("/login");
}

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
