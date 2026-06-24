"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthSelectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.role === "USER") {
            router.replace("/user/dashboard");
            return;
          } else if (data.role === "DRIVER") {
            router.replace("/chauffeur/dashboard");
            return;
          } else if (data.role === "ADMIN") {
            router.replace("/admin/dashboard");
            return;
          }
        }
      } catch {
        // No session, stay on select page
      }
      setChecking(false);
    }
    checkSession();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full mb-4" style={{ background: "#2A3055" }} />
          <div className="h-4 w-32 rounded" style={{ background: "#2A3055" }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg,#0A0A0F 0%,#131936 100%)", fontFamily: "var(--font-body)" }}
    >
      {/* Logo */}
      <div className="mb-8">
        <div className="relative" style={{ width: "200px", height: "100px" }}>
          <Image
            src="/images/logo/logo-stacked-tagline-ivory.svg"
            alt="MOVO PRIVÉ"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-[22px] font-bold mb-2 text-center" style={{ color: "#F5F5F2", fontFamily: "var(--font-heading)" }}>
        Welcome to MOVO Privé
      </h1>
      <p className="text-[13px] mb-8 text-center max-w-xs" style={{ color: "#8A8F9E" }}>
        Select how you&apos;d like to continue
      </p>

      {/* Options */}
      <div className="w-full max-w-sm space-y-3">
        {/* Rider */}
        <button
          onClick={() => router.push(`/user/login${from ? `?redirect=${encodeURIComponent(from)}` : ""}`)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all group"
          style={{ background: "rgba(42,48,85,0.4)", border: "1px solid #2A3055" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#131936,#2A3055)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div className="text-left flex-1">
            <p className="text-[15px] font-semibold" style={{ color: "#F5F5F2" }}>
              Continue as Rider
            </p>
            <p className="text-[11px]" style={{ color: "#8A8F9E" }}>Book premium rides</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Chauffeur */}
        <button
          onClick={() => router.push("/driver/onboarding")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all group"
          style={{ background: "rgba(42,48,85,0.4)", border: "1px solid #2A3055" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#131936,#2A3055)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <circle cx="7" cy="12" r="1" fill="white" />
              <circle cx="17" cy="12" r="1" fill="white" />
              <path d="M12 12h0" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-left flex-1">
            <p className="text-[15px] font-semibold" style={{ color: "#F5F5F2" }}>
              Continue as Chauffeur
            </p>
            <p className="text-[11px]" style={{ color: "#8A8F9E" }}>Drive with MOVO Privé</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: "#2A3055" }} />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-[11px]" style={{ background: "#131936", color: "#8A8F9E" }}>or</span>
          </div>
        </div>

        {/* Admin */}
        <button
          onClick={() => router.push("/admin/login")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all group"
          style={{ background: "rgba(42,48,85,0.4)", border: "1px solid #2A3055" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#2A3055" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="text-left flex-1">
            <p className="text-[15px] font-semibold" style={{ color: "#F5F5F2" }}>
              Admin Access
            </p>
            <p className="text-[11px]" style={{ color: "#8A8F9E" }}>Management panel</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Footer */}
      <p className="text-[11px] mt-8 text-center" style={{ color: "#8A8F9E" }}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
