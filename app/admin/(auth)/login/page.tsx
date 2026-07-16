"use client";

import Image from "next/image";
import Link from "next/link";
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
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg,#0A0A0F 0%,#131936 100%)", fontFamily: "var(--font-body)" }}
    >
      <div className="rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10" style={{ background: "#131936", border: "1px solid #2A3055" }}>

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative" style={{ width: "240px", height: "80px" }}>
            <Image src="/images/logo/logo-stacked-tagline-ivory.svg" alt="MOVO" fill className="object-contain" priority />
          </div>
        </div>

        <h2 className="text-[16px] font-bold mb-5" style={{ color: "#F5F5F2" }}>Log In to Admin Panel</h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#8A8F9E" }}>
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none placeholder-[#8A8F9E]"
              style={{ background: "#0A0A0F", border: "1px solid #2A3055", color: "#F5F5F2" }}
              suppressHydrationWarning
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#8A8F9E" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none placeholder-[#8A8F9E]"
              style={{ background: "#0A0A0F", border: "1px solid #2A3055", color: "#F5F5F2" }}
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
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
          >
            Log In
          </button>
        </form>

        <div className="flex items-center justify-center mt-5">
          <Link
            href="/admin/forgot-password"
            className="text-[12px] hover:text-[#C6BFB2] transition-colors" style={{ color: "#8A8F9E" }}
          >
            Forgot Password?
          </Link>
        </div>

      </div>
    </div>
  );
}
