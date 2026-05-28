"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */
export interface ConsentState {
  essential:   true;
  functional:  boolean;
  analytics:   boolean;
  marketing:   boolean;
  decided:     boolean;
}

const STORAGE_KEY = "movo_cookie_consent";

const DEFAULT_STATE: ConsentState = {
  essential:  true,
  functional: false,
  analytics:  false,
  marketing:  false,
  decided:    false,
};

/* ── Persist helpers ─────────────────────────────────────────────────────── */
function readConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  /* Also set a JS-accessible cookie for SSR middleware reads */
  const val = encodeURIComponent(JSON.stringify({
    functional: state.functional,
    analytics:  state.analytics,
    marketing:  state.marketing,
    decided:    state.decided,
  }));
  document.cookie = `movo_cookie_consent=${val}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
}

/* ── Hook ───────────────────────────────────────────────────────────────── */
export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_STATE);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  const save = useCallback((next: ConsentState) => {
    const final = { ...next, essential: true as true, decided: true };
    writeConsent(final);
    setConsent(final);
  }, []);

  const acceptAll = useCallback(() => {
    save({ essential: true, functional: true, analytics: true, marketing: true, decided: true });
  }, [save]);

  const essentialOnly = useCallback(() => {
    save({ essential: true, functional: false, analytics: false, marketing: false, decided: true });
  }, [save]);

  const savePreferences = useCallback((prefs: Omit<ConsentState, "essential" | "decided">) => {
    save({ essential: true, ...prefs, decided: true });
  }, [save]);

  const openPreferences  = useCallback(() => setShowPreferences(true),  []);
  const closePreferences = useCallback(() => setShowPreferences(false), []);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = "movo_cookie_consent=; path=/; max-age=0";
    setConsent(DEFAULT_STATE);
  }, []);

  return {
    consent,
    showPreferences,
    acceptAll,
    essentialOnly,
    savePreferences,
    openPreferences,
    closePreferences,
    resetConsent,
  };
}
