"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

export default function SetPasswordPage() {
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  return (
    <div
      className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center pt-6">
          <div className="relative w-44 h-44">
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
        </div>

        {/* Title */}
        <div className="text-center px-8 mt-4">
          <h1 className="text-[20px] font-semibold text-gray-900">Set your New Password</h1>
        </div>

        {/* Form */}
        <div className="px-8 mt-6 space-y-3">
          {/* New Password */}
          <div>
            <label className="text-[12px] text-gray-500 block mb-1">New Password</label>
            <div className="border border-purple-400 rounded-lg px-4 py-2 relative">
              <input
                type={showNew ? "text" : "password"}
                className="w-full focus:outline-none text-sm text-gray-800 pr-8"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-gray-400">
                <EyeIcon open={showNew} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-[12px] text-gray-500 block mb-1">Confirm Password</label>
            <div className="border border-purple-400 rounded-lg px-4 py-2 relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full focus:outline-none text-sm text-gray-800 pr-8"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-gray-400">
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          {/* Next button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => router.push("/onboarding/login")}
              className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide"
              style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
