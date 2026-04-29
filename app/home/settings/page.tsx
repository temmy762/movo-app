"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AppearanceMode = "system" | "light" | "dark";

function GradientToggle({ checked }: { checked: boolean }) {
  return (
    <div
      className="relative inline-flex h-7 w-12 shrink-0 rounded-full transition-all duration-200"
      style={{
        background: checked
          ? "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)"
          : "#d1d5db",
      }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: checked ? "calc(100% - 1.5rem)" : "0.25rem" }}
      />
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div
      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
      style={{ borderColor: selected ? "#2D0A53" : "#d1d5db" }}
    >
      {selected && (
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2D0A53" }} />
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AppearanceMode>("system");

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="no-hover-fx mb-3"
          aria-label="Go back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="text-[22px] font-bold text-gray-900">Settings</h1>
        {/* Gradient underline */}
        <div
          className="mt-2 h-[2px]"
          style={{ background: "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)" }}
        />
      </div>

      {/* App appearance */}
      <div className="px-5 pt-5">
        <p className="text-[13px] font-bold text-gray-900 mb-4">App appearance</p>

        {/* System settings */}
        <button
          type="button"
          onClick={() => setMode("system")}
          className="no-hover-fx w-full flex items-center justify-between py-3.5 border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <RadioDot selected={mode === "system"} />
            <span className="text-[14px] text-gray-800">System settings</span>
          </div>
          <GradientToggle checked={mode === "system"} />
        </button>

        {/* Always light */}
        <button
          type="button"
          onClick={() => setMode("light")}
          className="no-hover-fx w-full flex items-center justify-between py-3.5 border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <RadioDot selected={mode === "light"} />
            <span className="text-[14px] text-gray-800">Always light</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </button>

        {/* Always dark */}
        <button
          type="button"
          onClick={() => setMode("dark")}
          className="no-hover-fx w-full flex items-center justify-between py-3.5 border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <RadioDot selected={mode === "dark"} />
            <span className="text-[14px] text-gray-800">Always dark</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>

      {/* Account section */}
      <div className="px-5 pt-7">
        <p className="text-[13px] font-bold text-gray-900 mb-4">Account</p>

        <button
          type="button"
          className="no-hover-fx w-full flex items-center justify-between py-3.5 border-b border-gray-100"
        >
          <div className="flex items-center gap-3 text-red-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            <span className="text-[14px] font-medium">Delete my account</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
