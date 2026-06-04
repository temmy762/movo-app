"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    setError("");
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center" style={{ fontFamily: "var(--font-poppins)" }}>
        <div className="text-center px-8">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-[20px] font-semibold text-gray-900">Check your email</h1>
          <p className="text-gray-400 text-[12px] mt-2">We sent a password reset link to {email}</p>
          <button
            onClick={() => router.push("/onboarding/login")}
            className="mt-6 text-[12px] text-blue-600 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center pt-8">
          <div className="relative w-28 h-28">
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
        </div>

        <div className="text-center px-8 mt-6">
          <h1 className="text-[20px] font-semibold text-gray-900">Reset Password</h1>
          <p className="text-gray-400 text-[12px] mt-1">Enter your email to receive a reset link</p>
        </div>

        <div className="px-8 mt-6">
          <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-1">
            <label className="text-[12px] text-gray-500">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800"
            />
          </div>

          {error && <p className="text-[12px] text-red-500 text-center mt-2">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] mt-6 tracking-wide disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="text-center text-[12px] text-gray-500 mt-4">
            Remember your password?{" "}
            <a href="/onboarding/login" className="font-bold text-gray-900">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
