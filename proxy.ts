import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "./lib/session";
import { VEHICLE_RENTAL_ENABLED } from "./lib/launchConfig";

// ─── Route configuration ──────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/auth/select",
  "/user/login",
  "/user/register",
  "/chauffeur/login",
  "/chauffeur/register",
  "/admin/login",
  "/onboarding",
  "/onboarding/login",
  "/onboarding/register",
  "/onboarding/welcome",
  "/onboarding/start",
  "/onboarding/forgot-password",
  "/onboarding/verify-otp",
  "/onboarding/set-password",
  "/driver/onboarding",
  "/driver/onboarding/login",
  "/driver/onboarding/register",
  "/driver/onboarding/type",
  "/app-return",
  "/api",
  "/_next",
  "/images",
  "/favicon.ico",
];

const USER_ROUTES = ["/user/dashboard", "/home"];
const CHAUFFEUR_ROUTES = ["/chauffeur", "/driver/home"];
const ADMIN_ROUTES = ["/admin"];

/* Vehicle rental is switched off for the Safe Ride-only launch — see lib/launchConfig.ts */
const RENTAL_API_ROUTES = ["/api/rentals", "/api/driver/rental", "/api/admin/rentals"];
const RENTAL_PAGE_REDIRECTS: [string, string][] = [
  ["/driver/home/rentals", "/driver/home"],
  ["/admin/rentals", "/admin"],
];

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

// ─── Proxy function (Next.js 16+ middleware format) ─────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!VEHICLE_RENTAL_ENABLED) {
    if (matchesPrefix(pathname, RENTAL_API_ROUTES)) {
      return NextResponse.json({ error: "Vehicle rental is not currently available" }, { status: 404 });
    }
    const redirect = RENTAL_PAGE_REDIRECTS.find(([from]) => matchesPrefix(pathname, [from]));
    if (redirect) return NextResponse.redirect(new URL(redirect[1], req.url));
  }

  /* Admin APIs: admins only, enforced here for every route. Many admin
     endpoints had no check of their own (and /api is otherwise public), so
     anyone could list customers or delete accounts and payments. Reading
     pricing stays public — customer and chauffeur screens use it, and it
     already hides the internal settings from non-admins. */
  if (matchesPrefix(pathname, ["/api/admin"])) {
    const publicRead = req.method === "GET" && pathname === "/api/admin/pricing";
    if (!publicRead) {
      const session = await getSessionFromCookieHeader(req.headers.get("cookie"));
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Skip public routes (static assets, API, auth pages)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check session from cookie header
  const cookieHeader = req.headers.get("cookie");
  const session = await getSessionFromCookieHeader(cookieHeader);

  // ── No session ──────────────────────────────────────────────────────────────
  if (!session) {
    /* Keep the query too, so e.g. a Safe Ride booking link (?service=care)
       still opens the Safe Ride flow after logging in */
    const destination = pathname + req.nextUrl.search;
    /* A rider page (booking) needs no "Rider or Chauffeur?" question — go
       straight to the rider login, which links to sign-up */
    if (matchesPrefix(pathname, USER_ROUTES)) {
      const loginUrl = new URL("/user/login", req.url);
      loginUrl.searchParams.set("redirect", destination);
      return NextResponse.redirect(loginUrl);
    }
    const selectUrl = new URL("/auth/select", req.url);
    selectUrl.searchParams.set("from", destination);
    return NextResponse.redirect(selectUrl);
  }

  const { role } = session;

  // ── USER role checks ────────────────────────────────────────────────────────
  if (role === "USER") {
    if (matchesPrefix(pathname, ADMIN_ROUTES)) {
      return NextResponse.redirect(new URL("/user/dashboard", req.url));
    }
    if (matchesPrefix(pathname, CHAUFFEUR_ROUTES)) {
      return NextResponse.redirect(new URL("/user/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── DRIVER (Chauffeur) role checks ──────────────────────────────────────────
  if (role === "DRIVER") {
    if (matchesPrefix(pathname, ADMIN_ROUTES)) {
      return NextResponse.redirect(new URL("/chauffeur/dashboard", req.url));
    }
    if (matchesPrefix(pathname, USER_ROUTES)) {
      return NextResponse.redirect(new URL("/chauffeur/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── ADMIN role checks ───────────────────────────────────────────────────────
  if (role === "ADMIN") {
    if (matchesPrefix(pathname, USER_ROUTES)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    if (matchesPrefix(pathname, CHAUFFEUR_ROUTES)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Unknown role: treat as unauthenticated
  const selectUrl = new URL("/auth/select", req.url);
  return NextResponse.redirect(selectUrl);
}

// ─── Matcher configuration ────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
