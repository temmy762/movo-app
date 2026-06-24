"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface OnboardingData {
  id: string;
  type: string;
  reviewedAt: string | null;
}

export default function ApprovedPage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/driver/onboarding/status")
      .then(r => r.json())
      .then(d => {
        if (d.adminStatus === "APPROVED") {
          setData(d);
        } else {
          router.push("/driver/home");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-[480px] px-6 text-center">

          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-36 h-36">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          {/* Success icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #131936, #C6BFB2)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-extrabold text-gray-900 mb-2">
            🎉 Approved!
          </h1>

          {/* Message */}
          <p className="text-[14px] text-gray-600 mb-2 leading-relaxed">
            Congratulations! Your Movo Privé onboarding application has been approved.
          </p>

          <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Your account is now active and ready to use. You can start accepting rides immediately.
          </p>

          {/* What you can do now */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
            <p className="text-[12px] font-bold text-gray-700 mb-3">You can now:</p>
            <ul className="text-[12px] text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                <span>Go online and start accepting ride requests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                <span>View your earnings and trip history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                <span>Access the Partner Portal for support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                <span>Manage your profile and vehicle information</span>
              </li>
            </ul>
          </div>

          {/* Approval details */}
          {data?.reviewedAt && (
            <div className="text-[11px] text-gray-400 mb-6">
              Approved on {new Date(data.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/driver/home")}
              className="w-full py-3 rounded-xl text-white font-bold text-[14px] text-center"
              style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-[14px] text-center"
            >
              Back to Home
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
