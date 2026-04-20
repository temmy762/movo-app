"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

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
        <div className="px-8 mt-4">
          <h1 className="text-[22px] font-bold text-gray-900">Check your SMS</h1>
          <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
            We&apos;ve sent a 6-digit confirmation code to
          </p>
          <p className="text-gray-900 font-bold text-[13px]">03001234567</p>
        </div>

        {/* OTP Inputs */}
        <div className="px-8 mt-8 flex gap-3 justify-between">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-12 text-center text-lg font-bold border border-gray-400 rounded-lg focus:outline-none focus:border-purple-600 text-gray-900"
            />
          ))}
        </div>

        {/* Next button */}
        <div className="px-8 mt-10">
          <button
            type="button"
            onClick={() => router.push("/onboarding/set-password")}
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
