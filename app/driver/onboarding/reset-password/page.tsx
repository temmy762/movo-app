"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DriverResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  async function handleResetPassword() {
    setError("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/driver/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/driver/onboarding/login");
      }, 2000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="h-full bg-white flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[420px] px-8">
          {/* Logo */}
          <div className="flex items-center justify-center pt-6">
            <div className="relative w-44 h-44">
              <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          {/* Title */}
          <div className="mt-2 mb-6">
            <h1 className="text-[20px] font-bold text-gray-900">Reset Password</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Enter your new password below</p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-[14px] font-semibold text-green-800">Password Reset Successful!</p>
                  <p className="text-[12px] text-green-700 mt-1">Redirecting to login...</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[12px] text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M15.171 13.576l1.414 1.414a1 1 0 001.414-1.414l-1.414-1.414m2.121-2.121l1.414 1.414a1 1 0 11-1.414-1.414l-1.414-1.414" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">At least 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M15.171 13.576l1.414 1.414a1 1 0 001.414-1.414l-1.414-1.414m2.121-2.121l1.414 1.414a1 1 0 11-1.414-1.414l-1.414-1.414" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={handleResetPassword}
                disabled={loading || !token}
                className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              {/* Back to Login */}
              <p className="text-center text-[13px] text-gray-500 mt-4 pb-8">
                Remember your password?{" "}
                <button
                  onClick={() => router.push("/driver/onboarding/login")}
                  className="font-semibold"
                  style={{ color: "#2D0A53" }}
                >
                  Log In
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
