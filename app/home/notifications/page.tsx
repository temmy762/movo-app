"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function GradientToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-all duration-200"
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
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    pushRides: true,
    pushMarketing: true,
    smsRides: true,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* White card */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100 relative">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-5 no-hover-fx"
            aria-label="Go back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Notifications</h1>
        </div>

        {/* 3-card grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 px-3 py-5">

          {/* Left card */}
          <div className="hidden md:block rounded-2xl bg-white" />

          {/* Center card */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-5 flex flex-col gap-5">
            <p className="text-[12px] text-gray-500 leading-relaxed">
              Please select at least one notification channel for your rides
            </p>

            <div>
              <p className="text-[14px] font-bold text-gray-900 mb-4">Push notification</p>
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 pr-4">
                  <p className="text-[14px] font-semibold text-gray-900">Rides</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">Ride status, rate the ride</p>
                </div>
                <GradientToggle checked={settings.pushRides} onChange={() => toggle("pushRides")} />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-[14px] font-semibold text-gray-900">Marketing</p>
                  <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">
                    Personalized updates and offers, curated travel tips, feedback requests
                  </p>
                </div>
                <GradientToggle checked={settings.pushMarketing} onChange={() => toggle("pushMarketing")} />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
              <p className="text-[14px] font-bold text-gray-900 mb-4">Text messages</p>
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-[14px] font-semibold text-gray-900">Rides</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">Ride status.</p>
                </div>
                <GradientToggle checked={settings.smsRides} onChange={() => toggle("smsRides")} />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <p className="text-[12px] text-gray-400 text-center leading-relaxed">
              Ride status updates are also always sent via email
            </p>
          </div>

          {/* Right card */}
          <div className="hidden md:block rounded-2xl bg-white" />

        </div>
      </div>
    </div>
  );
}
