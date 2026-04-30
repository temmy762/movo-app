"use client";

import { useRouter } from "next/navigation";

export default function PlannedPage() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-[18px] font-bold text-gray-900">Planned</h1>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => {}}
        >
          My rides
        </button>
      </header>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-4">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="4" y1="4" x2="20" y2="20" stroke="#e5e7eb" strokeWidth="1.2" />
        </svg>
        <p className="text-[15px] font-semibold text-gray-700 mb-1">No assigned rides yet</p>
        <p className="text-[12px] text-gray-400 text-center mb-3">
          Once you are assigned to a ride it will be shown here.
        </p>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => {}}
        >
          Refresh
        </button>
      </div>

    </div>
  );
}
