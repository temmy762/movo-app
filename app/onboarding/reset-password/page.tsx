"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link");
    }
  }, [token]);

  async function handleReset() {
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed");
        return;
      }

      router.push("/onboarding/login?success=Password reset successfully");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center pt-8">
          <div className="relative w-28 h-28">
            <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO" fill className="object-contain" priority />
          </div>
        </div>

        <div className="text-center px-8 mt-6">
          <h1 className="text-[20px] font-semibold text-gray-900">Reset Password</h1>
          <p className="text-gray-400 text-[12px] mt-1">Enter your new password</p>
        </div>

        <div className="px-8 mt-6 space-y-3">
          <div className="border border-gray-400 rounded-lg px-4 py-1 relative">
            <label className="text-[11px] text-gray-500">New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800 pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 text-gray-400"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="border border-gray-400 rounded-lg px-4 py-1 relative">
            <label className="text-[11px] text-gray-500">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800 pr-8"
            />
          </div>

          {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleReset}
            disabled={loading || !token}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-full bg-white flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
