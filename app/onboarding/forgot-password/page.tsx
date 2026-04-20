"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const router = useRouter();

  return (
    <div
      className="h-full bg-white flex flex-col items-center justify-start sm:justify-center overflow-y-auto"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center pt-8 sm:pt-6">
          <div className="relative w-28 h-28 sm:w-24 sm:h-24">
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
        </div>

        {/* Title */}
        <div className="text-center px-8 mt-6">
          <h1 className="text-[20px] font-semibold text-gray-900">
            {mode === "phone" ? "Enter your Phone Number" : "Enter your Email"}
          </h1>
        </div>

        {/* Input */}
        <div className="px-8 mt-8">
          {mode === "phone" ? (
            <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-1">
              <label className="text-[12px] text-gray-500">Phone Number</label>
              <input type="tel" className="w-full focus:outline-none text-sm text-gray-800" />
            </div>
          ) : (
            <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-1">
              <label className="text-[12px] text-gray-500">Email Address</label>
              <input type="email" className="w-full focus:outline-none text-sm text-gray-800" />
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => setMode(mode === "phone" ? "email" : "phone")}
            className="text-[12px] text-gray-500 hover:underline"
          >
            {mode === "phone" ? "Use email instead" : "Use phone number instead"}
          </button>
        </div>

        {/* Next button */}
        <div className="px-8 mt-6">
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
  );
}
