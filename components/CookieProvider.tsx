"use client";

import CookieBanner from "./cookies/CookieBanner";

/* Thin client wrapper so it can be imported from the Server Component layout */
export default function CookieProvider() {
  return <CookieBanner />;
}
