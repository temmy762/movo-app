"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleForgotPassword() {
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/driver/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Forgot password error:", err);
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
            <h1 className="text-[20px] font-bold text-gray-900">Forgot Password?</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {submitted
                ? "Check your email for reset instructions"
                : "Enter your email to receive a password reset link"}
            </p>
          </div>

          {submitted ? (
            <>
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-[14px] font-semibold text-green-800">Email Sent!</p>
                    <p className="text-[12px] text-green-700 mt-1">
                      If an account exists with this email, you'll receive a password reset link shortly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-[12px] text-blue-800 mb-2">
                  <strong>What to do next:</strong>
                </p>
                <ul className="text-[12px] text-blue-700 space-y-1 ml-4">
                  <li>• Check your email inbox (and spam folder)</li>
                  <li>• Click the reset link in the email</li>
                  <li>• Enter your new password</li>
                  <li>• Log in with your new password</li>
                </ul>
              </div>

              {/* Resend or Back */}
              <button
                onClick={() => setSubmitted(false)}
                className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide mb-3"
                style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
              >
                Send Another Email
              </button>

              <Link
                href="/driver/onboarding/login"
                className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-[15px] text-center block"
              >
                Back to Login
              </Link>
            </>
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

              {/* Email Input */}
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60 mb-3"
                style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              {/* Back to Login */}
              <Link
                href="/driver/onboarding/login"
                className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-[15px] text-center block"
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
