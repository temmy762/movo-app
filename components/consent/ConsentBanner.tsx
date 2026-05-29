"use client";

import { useConsent } from "@/context/ConsentContext";

export default function ConsentBanner() {
  const { showBanner, acceptAll, essentialOnly, openModal } = useConsent();

  // Zero render until mounted + undecided — eliminates all flash/flicker
  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-[3000]"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* backdrop strip */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-md border-t border-gray-100" />

      <div className="relative max-w-2xl mx-auto px-5 py-5">
        {/* icon + title */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[14px] font-bold text-gray-900">We use cookies</p>
        </div>

        <p className="text-[12px] text-gray-500 leading-relaxed mb-4">
          Movo Privé uses cookies to keep you signed in, remember your preferences, and improve your
          experience. You control what we store.{" "}
          <button
            type="button"
            onClick={openModal}
            className="underline font-medium"
            style={{ color: "#2D0A53" }}
          >
            Learn more
          </button>
        </p>

        {/* actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={acceptAll}
            className="flex-1 min-w-[120px] py-2.5 rounded-xl text-white font-semibold text-[12px] tracking-wide"
            style={{ background: "linear-gradient(90deg,#1a1a2e,#2D0A53,#8B7500)" }}
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={essentialOnly}
            className="flex-1 min-w-[120px] py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[12px]"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={openModal}
            className="flex-1 min-w-[120px] py-2.5 rounded-xl border font-semibold text-[12px]"
            style={{ borderColor: "#2D0A53", color: "#2D0A53" }}
          >
            Manage Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
