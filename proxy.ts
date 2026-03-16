import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/about", "/pricing", "/forgot-password", "/reset-password"]);

/** Routes that require auth but NOT a workspace cookie. */
const NO_WORKSPACE_ROUTES = new Set(["/onboarding", "/workspaces", "/verify-email"]);

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow auth API routes through
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Skip middleware for server action POST requests
  if (request.headers.has("Next-Action")) {
    return NextResponse.next();
  }

  // Strip locale prefix for auth logic (e.g. /hi/login → /login)
  const localePattern = /^\/(en|hi|kn|ta|te|ml)(\/|$)/;
  const strippedPath = pathname.replace(localePattern, "/");

  const sessionCookie = getSessionCookie(request);

  // If the user is authenticated and hitting a public auth page, redirect away
  if (sessionCookie && PUBLIC_ROUTES.has(strippedPath)) {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }

  // If the user is NOT authenticated and hitting a protected route, redirect to login
  if (!sessionCookie && !PUBLIC_ROUTES.has(strippedPath) && strippedPath !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Let next-intl handle locale detection and prefix
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
