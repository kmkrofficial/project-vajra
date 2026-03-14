import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

/** Routes that require auth but NOT a workspace cookie. */
const NO_WORKSPACE_ROUTES = new Set(["/onboarding", "/workspaces"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow auth API routes through
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  // If the user is authenticated and hitting a public auth page, redirect away
  if (sessionCookie && PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }

  // If the user is NOT authenticated and hitting a protected route, redirect to login
  if (!sessionCookie && !PUBLIC_ROUTES.has(pathname) && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
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
