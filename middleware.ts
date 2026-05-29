import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromCookieHeader } from "./lib/session";

// ─── Route configuration ──────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/auth/select",
  "/user/login",
  "/user/register",
  "/chauffeur/login",
  "/chauffeur/register",
  "/admin/login",
  // Allow static assets and API routes
  "/_next",
  "/api",
  "/images",
  "/favicon.ico",
];

const USER_ROUTES = ["/user/dashboard", "/home"];
const CHAUFFEUR_ROUTES = ["/chauffeur", "/driver"];
const ADMIN_ROUTES = ["/admin"];

// Helper: check if path starts with any of the prefixes
function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

function isPublicRoute(path: string): boolean {
  return (
    PUBLIC_ROUTES.some((r) => path === r || path.startsWith(`${r}/`)) ||
    path.includes("/_next/") ||
    path.startsWith("/api/") ||
    path.startsWith("/images/")
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes (static assets, API, auth pages)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check session from cookie header
  const cookieHeader = request.headers.get("cookie");
  const session = await getSessionFromCookieHeader(cookieHeader);

  // ── No session: redirect to auth select ─────────────────────────────────────
  if (!session) {
    // If trying to access protected route without auth, send to auth select
    const selectUrl = new URL("/auth/select", request.url);
    selectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(selectUrl);
  }

  const { role } = session;

  // ── USER role checks ────────────────────────────────────────────────────────
  if (role === "USER") {
    // User trying to access admin routes → redirect to user dashboard
    if (matchesPrefix(pathname, ADMIN_ROUTES)) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
    // User trying to access chauffeur routes → redirect to user dashboard  
    if (matchesPrefix(pathname, CHAUFFEUR_ROUTES)) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
    // User accessing user routes → allow
    return NextResponse.next();
  }

  // ── DRIVER (Chauffeur) role checks ──────────────────────────────────────────
  if (role === "DRIVER") {
    // Driver trying to access admin routes → redirect to chauffeur dashboard
    if (matchesPrefix(pathname, ADMIN_ROUTES)) {
      return NextResponse.redirect(new URL("/chauffeur/dashboard", request.url));
    }
    // Driver trying to access user routes → redirect to chauffeur dashboard
    if (matchesPrefix(pathname, USER_ROUTES)) {
      return NextResponse.redirect(new URL("/chauffeur/dashboard", request.url));
    }
    // Driver accessing chauffeur routes → allow
    return NextResponse.next();
  }

  // ── ADMIN role checks ───────────────────────────────────────────────────────
  if (role === "ADMIN") {
    // Admin trying to access user routes → redirect to admin dashboard
    if (matchesPrefix(pathname, USER_ROUTES)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    // Admin trying to access chauffeur routes → redirect to admin dashboard
    if (matchesPrefix(pathname, CHAUFFEUR_ROUTES)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    // Admin accessing admin routes → allow
    return NextResponse.next();
  }

  // Unknown role: treat as unauthenticated
  const selectUrl = new URL("/auth/select", request.url);
  return NextResponse.redirect(selectUrl);
}

// ─── Matcher configuration ────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|api/).*)",
  ],
};
