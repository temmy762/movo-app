"use client";

// ── Deprecated shim — do not import this in new code ─────────────────────────
// Use `useConsent` from @/context/ConsentContext directly.
export type { ConsentState } from "@/lib/consent";
export { useConsent as useCookieConsent } from "@/context/ConsentContext";
