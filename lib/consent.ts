// ─── Consent utilities (no React, no side-effects) ────────────────────────────
// All read/write logic lives here so it can be tested independently.

export const CONSENT_KEY     = "movo_consent_v1";
export const CONSENT_COOKIE  = "movo_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_TTL_DAYS = 365;

export interface ConsentPreferences {
  functional: boolean;
  analytics:  boolean;
  marketing:  boolean;
}

export interface ConsentState extends ConsentPreferences {
  essential: true;           // always true, typed as literal
  decided:   boolean;        // false = first-time visitor
  version:   number;         // bumped when policy changes
  savedAt:   string | null;  // ISO timestamp
}

export const DEFAULT_CONSENT: ConsentState = {
  essential:  true,
  functional: false,
  analytics:  false,
  marketing:  false,
  decided:    false,
  version:    CONSENT_VERSION,
  savedAt:    null,
};

// ── Read ──────────────────────────────────────────────────────────────────────
export function readConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_CONSENT;

  // 1. Try localStorage (primary)
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const parsed: ConsentState = JSON.parse(raw);
      // Invalidate if version is outdated — treat as new visitor
      if (parsed.version !== CONSENT_VERSION) {
        clearConsent();
        return DEFAULT_CONSENT;
      }
      return { ...DEFAULT_CONSENT, ...parsed, essential: true };
    }
  } catch { /* corrupted — fall through */ }

  // 2. Fallback: try browser cookie
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed.version === CONSENT_VERSION) {
        // Restore to localStorage from cookie
        const state: ConsentState = { ...DEFAULT_CONSENT, ...parsed, essential: true };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
        return state;
      }
    }
  } catch { /* ignore */ }

  return DEFAULT_CONSENT;
}

// ── Write ─────────────────────────────────────────────────────────────────────
export function writeConsent(prefs: ConsentPreferences, decided = true): ConsentState {
  const state: ConsentState = {
    essential:  true,
    ...prefs,
    decided,
    version: CONSENT_VERSION,
    savedAt: new Date().toISOString(),
  };

  // localStorage (primary)
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));

  // Browser cookie (fallback + middleware reads)
  const encoded = encodeURIComponent(JSON.stringify({
    functional: state.functional,
    analytics:  state.analytics,
    marketing:  state.marketing,
    decided:    state.decided,
    version:    state.version,
  }));
  document.cookie = `${CONSENT_COOKIE}=${encoded}; path=/; max-age=${CONSENT_TTL_DAYS * 86400}; SameSite=Lax`;

  return state;
}

// ── Clear ─────────────────────────────────────────────────────────────────────
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONSENT_KEY);
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
}

// ── Utility ───────────────────────────────────────────────────────────────────
export function consentAllowed(
  category: keyof ConsentPreferences,
  state: ConsentState
): boolean {
  return state.decided && state[category] === true;
}
