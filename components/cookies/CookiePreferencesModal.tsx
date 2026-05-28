"use client";

import { useState } from "react";
import type { ConsentState } from "@/hooks/useCookieConsent";

/* ── Category config ────────────────────────────────────────────────────── */
interface Category {
  key:         keyof Omit<ConsentState, "essential" | "decided">;
  label:       string;
  description: string;
  always?:     boolean;
}

const CATEGORIES: Category[] = [
  {
    key:         "essential" as never,
    label:       "Essential Cookies",
    description: "Required to keep you signed in and protect your account. These cannot be disabled.",
    always:      true,
  },
  {
    key:         "functional",
    label:       "Functional Cookies",
    description: "Remembers your last pickup address and app settings so you don't have to re-enter them each visit.",
  },
  {
    key:         "analytics",
    label:       "Analytics Cookies",
    description: "Helps us understand how the app is used so we can make it better. No personal data is shared with third parties.",
  },
  {
    key:         "marketing",
    label:       "Marketing Cookies",
    description: "Allows us to show relevant promotions and offers. You can opt out at any time.",
  },
];

/* ── Toggle switch ──────────────────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
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

/* ── Modal ──────────────────────────────────────────────────────────────── */
interface Props {
  onSave:  (prefs: Omit<ConsentState, "essential" | "decided">) => void;
  onClose: () => void;
}

export default function CookiePreferencesModal({ onSave, onClose }: Props) {
  const [prefs, setPrefs] = useState({
    functional: false,
    analytics:  false,
    marketing:  false,
  });

  const toggle = (key: keyof typeof prefs, val: boolean) =>
    setPrefs((p) => ({ ...p, [key]: val }));

  return (
    <div
      className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", fontFamily: "var(--font-poppins)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">Cookie Preferences</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Control what MOVO stores on your device</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* categories */}
        <div className="px-5 py-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {CATEGORIES.map((cat) => (
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
                <p className="text-[11.5px] text-gray-500 leading-relaxed">{cat.description}</p>
              </div>
              <Toggle
                checked={cat.always ? true : prefs[cat.key as keyof typeof prefs] ?? false}
                onChange={(v) => cat.key !== "essential" && toggle(cat.key as keyof typeof prefs, v)}
                disabled={cat.always}
              />
            </div>
          ))}
        </div>

        {/* privacy note */}
        <div className="mx-5 mb-4 px-3 py-2.5 bg-gray-50 rounded-xl">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Your privacy matters. MOVO never sells your data. Essential cookies are required for the app to work.
            Read our{" "}
            <a href="/privacy" className="underline text-[#2D0A53]">Privacy Policy</a>.
          </p>
        </div>

        {/* actions */}
        <div className="flex gap-3 px-5 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[13px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(prefs)}
            className="flex-1 py-3 rounded-xl text-white font-bold text-[13px]"
            style={{ background: "linear-gradient(90deg,#1a1a2e,#2D0A53,#8B7500)" }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
