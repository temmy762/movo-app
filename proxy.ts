import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "movo_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  // ── /home/* requires any authenticated session ────────────────────────────
  if (pathname.startsWith("/home")) {
    if (!token) {
      return NextResponse.redirect(new URL("/onboarding/login", req.url));
    }
    return NextResponse.next();
  }

  // ── /driver/home/* requires a driver session ──────────────────────────────
  if (pathname.startsWith("/driver/home")) {
    if (!token) {
      return NextResponse.redirect(
        new URL("/driver/onboarding/login", req.url)
      );
    }
    return NextResponse.next();
  }

  // ── /admin/* (except /admin/login) requires any session ───────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/driver/home/:path*", "/admin", "/admin/:path*"],
};
