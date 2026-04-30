"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function SectionRow({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-hover-fx w-full flex items-center justify-between py-3 px-0 border-b border-gray-100 last:border-0"
    >
      <span className="text-[14px] font-medium text-gray-800">{label}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-0">{title}</p>
      <div className="bg-white rounded-xl px-4 divide-y divide-gray-100 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export default function DriverProfilePage() {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);

  return (
    <div className="min-h-full bg-gray-50" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1 md:hidden" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-[18px] font-bold text-gray-900 leading-tight">Ali</p>
          <p className="text-[12px] text-gray-400">Profile details</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
          {photo ? (
            <img src={photo} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="px-4 pt-5 pb-8 max-w-2xl md:max-w-4xl md:mx-auto md:grid md:grid-cols-2 md:gap-6 md:pt-8">

        {/* Left col — photo upload */}
        <div>
          <div className="bg-white rounded-xl px-4 py-4 shadow-sm mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Add your photo</p>
                <p className="text-[11px] text-gray-400">Your photo will help guests recognize you.</p>
              </div>
            </div>
            <label
              className="text-[12px] font-bold cursor-pointer"
              style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              UPLOAD
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>
        </div>

        {/* Right col — settings */}
        <div>
          <SectionGroup title="Vehicle">
            <SectionRow label="Default Vehicles" />
          </SectionGroup>

          <SectionGroup title="Support">
            <SectionRow label="Help" />
            <SectionRow label="Share Feedback" />
          </SectionGroup>

          <SectionGroup title="Legal">
            <SectionRow label="Legal Notice" />
            <SectionRow label="Privacy Policy" />
            <SectionRow label="GPS Tracking Policy" />
          </SectionGroup>
        </div>

        {/* Log out — full width */}
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/login")}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px]"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Log out
          </button>
        </div>

      </div>
    </div>
  );
}
