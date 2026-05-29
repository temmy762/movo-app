"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type ConsentState,
  type ConsentPreferences,
  DEFAULT_CONSENT,
  clearConsent,
  readConsent,
  writeConsent,
} from "@/lib/consent";

// ── Context shape ─────────────────────────────────────────────────────────────
interface ConsentContextValue {
  /** Current consent state. Before mount this equals DEFAULT_CONSENT. */
  consent:        ConsentState;
  /** True only after client hydration — prevents SSR/hydration flash */
  mounted:        boolean;
  /** True when banner should display: mounted + not yet decided */
  showBanner:     boolean;
  /** Whether the preferences modal is open */
  showModal:      boolean;
  acceptAll:      () => void;
  essentialOnly:  () => void;
  savePreferences:(prefs: ConsentPreferences) => void;
  openModal:      () => void;
  closeModal:     () => void;
  resetConsent:   () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent,  setConsent]  = useState<ConsentState>(DEFAULT_CONSENT);
  const [mounted,  setMounted]  = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Hydrate from storage exactly once, after mount — prevents hydration mismatch
  useEffect(() => {
    setConsent(readConsent());
    setMounted(true);
  }, []);

  const persist = useCallback((prefs: ConsentPreferences) => {
    const next = writeConsent(prefs);
    setConsent(next);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ functional: true, analytics: true, marketing: true });
    setShowModal(false);
  }, [persist]);

  const essentialOnly = useCallback(() => {
    persist({ functional: false, analytics: false, marketing: false });
    setShowModal(false);
  }, [persist]);

  const savePreferences = useCallback((prefs: ConsentPreferences) => {
    persist(prefs);
    setShowModal(false);
  }, [persist]);

  const openModal  = useCallback(() => setShowModal(true),  []);
  const closeModal = useCallback(() => setShowModal(false), []);

  const resetConsent = useCallback(() => {
    clearConsent();
    setConsent(DEFAULT_CONSENT);
    setShowModal(false);
  }, []);

  const showBanner = mounted && !consent.decided;

  return (
    <ConsentContext.Provider value={{
      consent, mounted, showBanner, showModal,
      acceptAll, essentialOnly, savePreferences,
      openModal, closeModal, resetConsent,
    }}>
      {children}
    </ConsentContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used inside <ConsentProvider>");
  return ctx;
}
