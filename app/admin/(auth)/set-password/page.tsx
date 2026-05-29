"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function AdminSetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to reset password");
        return;
      }

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/admin/login");
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm px-8 py-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-[18px] font-bold text-gray-900 mb-2">Password Reset!</h2>
          <p className="text-[13px] text-gray-500">
            Your password has been successfully reset. Redirecting to login...
          </p>
        </div>
      </div>
    );
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

        <h2 className="text-[16px] font-bold text-gray-900 mb-2">Set New Password</h2>
        <p className="text-[12px] text-gray-500 mb-5">
          Create a new password for your admin account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* New Password */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 focus:outline-none focus:border-[#2D0A53] placeholder-gray-300 pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 focus:outline-none focus:border-[#2D0A53] placeholder-gray-300 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] mt-1 disabled:opacity-60"
            style={{ background: "#1a1a2e" }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="flex items-center justify-center mt-5">
          <button
            onClick={() => router.push("/admin/login")}
            className="text-[12px] text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
