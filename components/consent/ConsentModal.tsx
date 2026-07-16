"use client";

import { useEffect, useState } from "react";
import { useConsent } from "@/context/ConsentContext";
import type { ConsentPreferences } from "@/lib/consent";

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: checked ? "linear-gradient(90deg,#2D0A53,#8B7500)" : "#d1d5db" }}
    >
      <span
        className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key:     "essential" as const,
    label:   "Essential Cookies",
    desc:    "Required to keep you signed in and protect your account. Cannot be disabled.",
    always:  true,
  },
  {
    key:     "functional" as const,
    label:   "Functional Cookies",
    desc:    "Remembers your last pickup address and app settings so you don't have to re-enter them each visit.",
    always:  false,
  },
  {
    key:     "analytics" as const,
    label:   "Analytics Cookies",
    desc:    "Helps us understand how the app is used so we can improve it. No personal data is shared with third parties.",
    always:  false,
  },
  {
    key:     "marketing" as const,
    label:   "Marketing Cookies",
    desc:    "Allows us to show relevant promotions and offers tailored to you. You can opt out at any time.",
    always:  false,
  },
];

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function ConsentModal() {
  const { consent, showModal, savePreferences, closeModal, acceptAll, essentialOnly } = useConsent();

  // Initialize toggles from CURRENT saved consent — fixes the reset-to-false bug
  const [prefs, setPrefs] = useState<ConsentPreferences>({
    functional: consent.functional,
    analytics:  consent.analytics,
    marketing:  consent.marketing,
  });

  // Sync when modal opens (handles case where consent changed elsewhere)
  useEffect(() => {
    if (showModal) {
      setPrefs({
        functional: consent.functional,
        analytics:  consent.analytics,
        marketing:  consent.marketing,
      });
    }
  }, [showModal, consent.functional, consent.analytics, consent.marketing]);

  if (!showModal) return null;

  const toggle = (key: keyof ConsentPreferences, val: boolean) =>
    setPrefs(p => ({ ...p, [key]: val }));

  return (
    <div
      className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", fontFamily: "var(--font-poppins)" }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">Cookie Preferences</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Control what Movo stores on your device</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Categories */}
        <div className="px-5 py-4 flex flex-col gap-4 max-h-[52vh] overflow-y-auto">
          {CATEGORIES.map(cat => {
            const checked = cat.always ? true : prefs[cat.key as keyof ConsentPreferences] ?? false;
            return (
              <div key={cat.key} className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-semibold text-gray-900">{cat.label}</p>
                    {cat.always && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Always Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-gray-500 leading-relaxed">{cat.desc}</p>
                </div>
                <Toggle
                  checked={checked}
                  onChange={v => !cat.always && toggle(cat.key as keyof ConsentPreferences, v)}
                  disabled={cat.always}
                />
              </div>
            );
          })}
        </div>

        {/* Privacy note */}
        <div className="mx-5 mb-4 px-3 py-2.5 bg-gray-50 rounded-xl">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Your privacy matters. Movo never sells your data. Essential cookies are required for
            the app to work.{" "}
            <a href="/privacy" className="underline" style={{ color: "#2D0A53" }}>
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-5 pb-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={essentialOnly}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-[12px]"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="flex-1 py-2.5 rounded-xl text-white font-bold text-[12px]"
              style={{ background: "linear-gradient(90deg,#1a1a2e,#2D0A53,#8B7500)" }}
            >
              Accept All
            </button>
          </div>
          <button
            type="button"
            onClick={() => savePreferences(prefs)}
            className="w-full py-3 rounded-xl font-bold text-[13px] border-2"
            style={{ borderColor: "#2D0A53", color: "#2D0A53" }}
          >
            Save My Preferences
          </button>
        </div>

      </div>
    </div>
  );
}
