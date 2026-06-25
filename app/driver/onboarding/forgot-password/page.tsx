"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverForgotPasswordPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleForgotPassword() {
    setError("");
    if (method === "email") {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address."); return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/driver/forgot-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to process request."); return; }
        setSubmitted(true);
      } catch { setError("Network error. Please try again."); }
      finally { setLoading(false); }
    } else {
      if (!phone) { setError("Please enter your phone number."); return; }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/driver/forgot-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to send code."); return; }
        setOtpSent(true);
      } catch { setError("Network error. Please try again."); }
      finally { setLoading(false); }
    }
  }

  async function handlePhoneReset() {
    setError("");
    if (!otp || otp.length !== 6) { setError("Enter the 6-digit code sent to your phone."); return; }
    if (!newPassword || newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/driver/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to reset password."); return; }
      setSubmitted(true);
      setTimeout(() => router.push("/driver/onboarding/login"), 2000);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[420px] px-8">
          <div className="flex items-center justify-center pt-6">
            <div className="relative w-44 h-44">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>
          <div className="mt-2 mb-6">
            <h1 className="text-[20px] font-bold text-gray-900">Forgot Password?</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {submitted ? (method === "phone" ? "Password reset successfully" : "Check your email for reset instructions") : "Choose how to recover your account"}
            </p>
          </div>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-[14px] font-semibold text-green-800">
                {method === "phone" ? "Password reset successfully!" : "Email Sent!"}
              </p>
              <p className="text-[12px] text-green-700 mt-1">
                {method === "phone" ? "Redirecting to login…" : "If an account exists, you'll receive a reset link shortly."}
              </p>
            </div>
          ) : otpSent ? (
            <>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-[12px] text-red-700">{error}</div>}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-[12px] text-blue-800">
                A 6-digit code was sent to <strong>{phone}</strong>. Enter it below with your new password.
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Verification Code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-widest text-center" />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <button onClick={handlePhoneReset} disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60 mb-3"
                style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
              <button onClick={() => { setOtpSent(false); setError(""); }} className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-[15px]">
                Back
              </button>
            </>
          ) : (
            <>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-[12px] text-red-700">{error}</div>}

              {/* Method tabs */}
              <div className="flex rounded-xl border border-gray-200 p-1 mb-5 gap-1">
                {(["email", "phone"] as const).map(m => (
                  <button key={m} type="button" onClick={() => { setMethod(m); setError(""); }}
                    className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
                    style={{ background: method === m ? "#131936" : "transparent", color: method === m ? "white" : "#6b7280" }}>
                    {m === "email" ? "Email" : "Phone"}
                  </button>
                ))}
              </div>

              {method === "email" ? (
                <div className="mb-5">
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ) : (
                <div className="mb-5">
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              )}

              <button onClick={handleForgotPassword} disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60 mb-3"
                style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
                {loading ? "Sending…" : method === "email" ? "Send Reset Link" : "Send Code"}
              </button>
              <Link href="/driver/onboarding/login" className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-[15px] text-center block">
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
