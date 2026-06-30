"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_config:          "Social login is not configured. Please contact support.",
  google_not_linked:     "This Google account is not linked to an existing MOVO account. Please sign up first using Google, or log in with your email and password if you already have an account.",
  google_wrong_provider: "This account was registered using email and password. Please log in with your email and password instead.",
  google_token_failed:   "We couldn't complete Google authentication right now. Please try again in a moment.",
  google_provider_failed: "We couldn't complete Google authentication right now. Please try again in a moment.",
  google_no_email:       "Your Google account did not share an email address. Please log in with email and password instead.",
  google_cancelled:      "Google sign-in was cancelled before completion. Please try again if you'd like to continue.",
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = searchParams.get("error");
    if (e && OAUTH_ERRORS[e]) setError(OAUTH_ERRORS[e]);
  }, [searchParams]);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "email" ? { email, password } : { phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      // Redirect to intended page or dashboard
      router.push(redirect || "/user/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="w-full max-w-[420px]">
      {/* Back button */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={() => router.push("/auth/select")}
          className="flex items-center gap-1 text-gray-500 text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div />
      </div>

      {/* Logo */}
      <div className="flex items-center justify-center pt-2 sm:pt-1">
        <div className="relative" style={{ width: "160px", height: "140px" }}>
          <Image
            src="/images/logo/logo-stacked-navy.svg"
            alt="MOVO PRIVÉ"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Title */}
      <div className="text-center px-8 mt-1">
        <p
          className="text-[18px] font-bold"
          style={{ background: "linear-gradient(90deg, #131936, #C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Welcome back!
        </p>
        <h1 className="text-[20px] sm:text-[17px] font-bold text-gray-900 mt-0.5">
          Log in to your Account
        </h1>
        <p className="text-gray-400 text-[13px] mt-1">
          Welcome back, please enter your details.
        </p>
      </div>

      {/* Form */}
      <div className="px-8 mt-4 sm:mt-3 space-y-2 sm:space-y-2">
        {/* Email or Phone input */}
        {mode === "email" ? (
          <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-1">
            <label className="text-[12px] text-gray-500">Email Address*</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800"
            />
          </div>
        ) : (
          <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-1">
            <label className="text-[12px] text-gray-500">Phone Number*</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800"
            />
          </div>
        )}

        {/* Password */}
        <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-1 relative">
          <label className="text-[12px] text-gray-400">Password*</label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full focus:outline-none text-sm text-gray-800 mt-0.5 pr-8"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-4 text-gray-400"
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {/* Remember me + Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            <span className="text-[12px] text-gray-600">Remember me</span>
          </label>
          <Link
            href="/onboarding/forgot-password"
            className="text-[12px] font-semibold text-gray-700"
          >
            Forgot password?
          </Link>
        </div>

        {/* Toggle mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(mode === "email" ? "phone" : "email")}
            className="text-[12px] text-gray-500 underline-offset-2 hover:underline"
          >
            {mode === "email"
              ? "Sign in with Phone Number"
              : "Sign in with E-mail"}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-[12px] text-red-500 text-center">{error}</p>
        )}

        {/* Log In button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 sm:py-2.5 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)",
          }}
        >
          Log In
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-[12px]">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Social login */}
        <div className="flex justify-center gap-6 pb-1">
          {/* Google */}
          <button type="button" onClick={() => { window.location.href = `/api/auth/google?intent=login${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`; }} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </button>
          {/* Facebook */}
          <button type="button" onClick={() => { window.location.href = "/api/auth/facebook"; }} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
          {/* Apple */}
          <button type="button" onClick={() => alert("Apple Sign In coming soon.")} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </button>
        </div>

        {/* Register link */}
        <p className="text-center text-[12px] text-gray-500 pb-6 sm:pb-3">
          Don&apos;t have an account?{" "}
          <Link
            href={`/user/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
            className="font-bold text-gray-900"
          >
            Register Now
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
