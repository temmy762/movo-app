"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      router.push("/admin");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm px-8 py-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative" style={{ width: "300px", height: "96px" }}>
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
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
          {error && (
            <p className="text-[12px] text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] mt-1 disabled:opacity-60"
            style={{ background: "#1a1a2e" }}
          >
            Log In
          </button>
        </form>

        <div className="flex items-center justify-center mt-5">
          <button className="no-hover-fx text-[12px] text-gray-400">Forgot Password?</button>
        </div>

      </div>
    </div>
  );
}
