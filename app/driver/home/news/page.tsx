"use client";

import { useRouter } from "next/navigation";

export default function DriverNewsPage() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1 md:hidden" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" stroke="none" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">News feed</h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-[14px] text-gray-400 text-center leading-relaxed">
          We have no updates.<br />Please check again later.
        </p>
      </div>

    </div>
  );
}
