"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
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
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError("");
    if (method === "email") {
      if (!email) { setError("Email is required"); return; }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Request failed"); return; }
        setSuccess(true);
      } catch { setError("Something went wrong. Please try again."); }
      finally { setLoading(false); }
    } else {
      if (!phone) { setError("Phone number is required"); return; }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Failed to send code"); return; }
        setOtpSent(true);
      } catch { setError("Something went wrong. Please try again."); }
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to reset password"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/onboarding/login"), 2000);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  const BtnStyle = { background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" };

  if (success) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center" style={{ fontFamily: "var(--font-body)" }}>
        <div className="text-center px-8">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-[20px] font-semibold text-gray-900">
            {method === "phone" ? "Password Reset!" : "Check your email"}
          </h1>
          <p className="text-gray-400 text-[12px] mt-2">
            {method === "phone" ? "Redirecting to login…" : `We sent a password reset link to ${email}`}
          </p>
          <button onClick={() => router.push("/onboarding/login")} className="mt-6 text-[12px] text-blue-600 hover:underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center pt-8">
          <div className="relative w-28 h-28">
            <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
        </div>

        <div className="text-center px-8 mt-4">
          <h1 className="text-[20px] font-semibold text-gray-900">Reset Password</h1>
          <p className="text-gray-400 text-[12px] mt-1">
            {otpSent ? "Enter the code sent to your phone" : "Choose how to recover your account"}
          </p>
        </div>

        <div className="px-8 mt-5">
          {error && <p className="text-[12px] text-red-500 text-center mb-3">{error}</p>}

          {otpSent ? (
            <>
              <p className="text-[12px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
                A 6-digit code was sent to <strong>{phone}</strong>. Enter it below with your new password.
              </p>
              <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-2 mb-3">
                <label className="text-[12px] text-gray-500">Verification Code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full focus:outline-none text-sm text-gray-800 tracking-widest text-center" />
              </div>
              <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-2 mb-3">
                <label className="text-[12px] text-gray-500">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full focus:outline-none text-sm text-gray-800" />
              </div>
              <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-2 mb-4">
                <label className="text-[12px] text-gray-500">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full focus:outline-none text-sm text-gray-800" />
              </div>
              <button type="button" onClick={handlePhoneReset} disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60 mb-3" style={BtnStyle}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setError(""); }}
                className="w-full py-2 text-[12px] text-gray-500 hover:underline">
                Back
              </button>
            </>
          ) : (
            <>
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
                <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-2 mb-4">
                  <label className="text-[12px] text-gray-500">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full focus:outline-none text-sm text-gray-800" />
                </div>
              ) : (
                <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-2 mb-4">
                  <label className="text-[12px] text-gray-500">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000" className="w-full focus:outline-none text-sm text-gray-800" />
                </div>
              )}

              <button type="button" onClick={handleSubmit} disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60" style={BtnStyle}>
                {loading ? "Sending…" : method === "email" ? "Send Reset Link" : "Send Code"}
              </button>

              <p className="text-center text-[12px] text-gray-500 mt-4">
                Remember your password?{" "}
                <a href="/onboarding/login" className="font-bold text-gray-900">Log in</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
