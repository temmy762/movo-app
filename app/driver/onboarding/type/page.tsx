"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function OnboardingTypePage() {
  const router = useRouter();

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[420px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-8">
            <div className="relative w-28 h-28">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          <h1 className="text-[22px] font-extrabold text-gray-900 mt-3 text-center">
            Join Movo Privé
          </h1>
          <p className="text-[13px] text-gray-400 text-center mt-1 mb-8">
            Choose how you want to join our platform
          </p>

          {/* Individual Chauffeur Card */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/register?type=INDIVIDUAL")}
            className="no-hover-fx w-full text-left mb-4 rounded-2xl border-2 p-5 transition-all"
            style={{ borderColor: "#131936", background: "linear-gradient(135deg,#13193608 0%,#C6BFB208 100%)" }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-gray-900">Individual Chauffeur</p>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                  Drive independently with your own vehicle. Perfect for professional chauffeurs looking to grow their income.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Flexible hours", "Premium clients", "Fast onboarding"].map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "#f3e8ff", color: "#131936" }}>{tag}</span>
                  ))}
                </div>
              </div>
              <svg className="shrink-0 mt-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>

          {/* Fleet Partner Card */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/register?type=FLEET")}
            className="no-hover-fx w-full text-left mb-8 rounded-2xl border-2 p-5 transition-all border-gray-200"
            style={{ background: "#fafafa" }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gray-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-gray-900">Fleet Partner</p>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                  Register a fleet of vehicles and drivers. Ideal for transportation companies and operators.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Multiple vehicles", "Fleet management", "Volume pricing"].map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
                  ))}
                </div>
              </div>
              <svg className="shrink-0 mt-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>

          <p className="text-center text-[12px] text-gray-400 pb-8">
            Already have an account?{" "}
            <button type="button" onClick={() => router.push("/driver/onboarding/login")}
              className="font-semibold" style={{ color: "#131936" }}>
              Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
