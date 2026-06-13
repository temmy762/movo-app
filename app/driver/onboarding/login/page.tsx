"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Invalid email or password. Please check and try again.");
        } else if (res.status === 404) {
          setError("No account found with this email. Please register first.");
        } else if (res.status === 403) {
          setError("Your account has been deactivated. Please contact support.");
        } else if (res.status === 500) {
          setError("Server error. Please try again in a few moments.");
        } else {
          setError(data.error || "Login failed. Please try again.");
        }
        return;
      }
      
      // ACTIVE drivers go straight to dashboard
      if (data.driver.status === "ACTIVE") {
        router.push("/driver/home");
        return;
      }
      // Non-active: check detailed onboarding status for routing
      const statusRes = await fetch("/api/driver/onboarding/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.adminStatus === "REJECTED") {
          router.push("/driver/onboarding/rejected");
        } else if (statusData.adminStatus === "PENDING" || statusData.adminStatus === "UNDER_REVIEW") {
          router.push("/driver/onboarding/pending");
        } else if (statusData.adminStatus === "NOT_SUBMITTED" || !statusData.adminStatus) {
          // Still in onboarding — resume at the right flow
          router.push(statusData.type === "FLEET" ? "/driver/onboarding/partner" : "/driver/onboarding/chauffeur");
        } else {
          router.push("/driver/onboarding/pending");
        }
      } else {
        router.push("/driver/onboarding/chauffeur");
      }
    } catch (err) {
      console.error("Login error:", err);
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
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[420px] px-8">

          {/* Logo */}
          <div className="flex items-center justify-center pt-6">
            <div className="relative w-44 h-44">
              <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          {/* Title */}
          <div className="mt-2">
            <h1 className="text-[20px] font-bold text-gray-900">Welcome</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Log in to start driving with{" "}
              <span
                className="font-semibold"
                style={{
                  background: "linear-gradient(90deg, #2D0A53, #8B7500)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Movo Privé
              </span>
            </p>
          </div>

          {/* Form */}
          <div className="mt-5 space-y-3">

            {/* Email */}
            <div className="border border-gray-300 rounded-lg px-4 pt-1.5 pb-1.5">
              <label className="block text-[11px] text-gray-400">Email address*</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full focus:outline-none text-[14px] text-gray-800 mt-0.5"
              />
            </div>

            {/* Password */}
            <div className="border border-gray-300 rounded-lg px-4 pt-1.5 pb-1.5 relative">
              <label className="block text-[11px] text-gray-400">Password*</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full focus:outline-none text-[14px] text-gray-800 mt-0.5 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="no-hover-fx absolute right-4 top-4 text-gray-400"
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <Link
                href="/driver/onboarding/forgot-password"
                className="text-[12px] font-semibold underline"
                style={{ color: "#2D0A53" }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

            {/* Log In button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
            >
              Log In
            </button>
          </div>

        </div>
      </div>

      {/* Bottom bar — Become a Partner */}
      <div
        className="px-6 py-5 text-center"
        style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
      >
        <p className="text-[13px] text-white/70">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/auth/select"
            className="font-bold"
            style={{ color: "#c9a227" }}
          >
            Become a Partner
          </Link>
        </p>
      </div>
    </div>
  );
}
