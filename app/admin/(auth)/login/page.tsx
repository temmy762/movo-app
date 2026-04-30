"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    router.push("/admin");
  }

  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm px-8 py-10">

        {/* Illustration + Logo */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center mb-4 overflow-hidden"
            style={{ background: "linear-gradient(135deg,#e8d0ff 0%,#b89af0 50%,#7c4db5 100%)" }}
          >
            <svg width="68" height="76" viewBox="0 0 68 76" fill="none">
              <circle cx="34" cy="18" r="14" fill="#f5e6d3" />
              <path d="M24 14 Q34 6 44 14 Q44 9 34 7 Q24 9 24 14z" fill="#1a1a1a" />
              <path d="M18 75 Q18 48 34 44 Q50 48 50 75Z" fill="#1a1a2e" />
              <path d="M32 44 L34 56 L36 44" fill="white" />
              <path d="M33.5 48 L34 60 L34.5 48" fill="#8B7500" strokeWidth="1" />
            </svg>
          </div>
          <div className="relative w-36 h-10">
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
          <p className="text-[9px] tracking-[0.18em] text-gray-400 uppercase mt-1.5">
            The Art of Sophisticated Travel
          </p>
        </div>

        <h2 className="text-[16px] font-bold text-gray-900 mb-5">Log In to Admin Panel</h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 focus:outline-none focus:border-[#2D0A53] placeholder-gray-300"
              suppressHydrationWarning
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 focus:outline-none focus:border-[#2D0A53] placeholder-gray-300"
              suppressHydrationWarning
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] mt-1"
            style={{ background: "#1a1a2e" }}
          >
            Log In
          </button>
        </form>

        <div className="flex items-center justify-between mt-5">
          <button className="no-hover-fx text-[12px] text-gray-400">Forgot Password?</button>
          <button
            className="no-hover-fx text-[12px] font-semibold"
            style={{ color: "#2D0A53" }}
            onClick={() => router.push("/onboarding/register")}
          >
            Sign up
          </button>
        </div>

      </div>
    </div>
  );
}
