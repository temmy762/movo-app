"use client";

import { useRouter } from "next/navigation";

export default function PersonalInfoPage() {
  const router = useRouter();


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
        <h1 className="text-[22px] font-bold text-gray-900">Personal information</h1>
        {/* Gradient underline */}
        <div
          className="mt-2 h-[2px]"
          style={{ background: "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)" }}
        />
      </div>

      {/* 3-card grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 px-3 py-5">

        {/* Left card */}
        <div className="hidden md:block rounded-2xl bg-white" />

        {/* Center card */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between px-5 py-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-bold text-gray-900">Contact details</p>
              <div>
                <p className="text-[15px] font-semibold text-gray-900">Adams W</p>
              </div>
              <div>
                <p className="text-[12px] text-gray-400">Mobile Number</p>
                <p className="text-[14px] font-medium text-gray-800">+1874*******34</p>
              </div>
              <div>
                <p className="text-[12px] text-gray-400">Email</p>
                <p className="text-[14px] font-medium text-gray-800">Example@gmail.com</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/home/profile/personal-info/edit")}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] mt-8"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Change information
          </button>
        </div>

        {/* Right card */}
        <div className="hidden md:block rounded-2xl bg-white" />

      </div>
    </div>
  );
}
