"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface OnboardingData {
  id: string;
  type: string;
  adminNote: string | null;
  reviewedAt: string | null;
}

export default function RejectedPage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/driver/onboarding/status")
      .then(r => r.json())
      .then(d => {
        if (d.adminStatus === "REJECTED") {
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

          {/* Rejected icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #fee2e2, #fecaca)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-extrabold text-gray-900 mb-2">
            Application Not Approved
          </h1>

          {/* Message */}
          <p className="text-[14px] text-gray-600 mb-2 leading-relaxed">
            Unfortunately, your Movo Privé onboarding application was not approved at this time.
          </p>

          <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            This may be due to missing or incomplete information, background check results, or other verification issues.
          </p>

          {/* Admin note if provided */}
          {data?.adminNote && (
            <div className="bg-red-50 rounded-2xl p-4 mb-6 border border-red-100">
              <p className="text-[12px] font-bold text-red-900 mb-2">Reason for Rejection</p>
              <p className="text-[12px] text-red-800 leading-relaxed">{data.adminNote}</p>
            </div>
          )}

          {/* What you can do */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
            <p className="text-[12px] font-bold text-gray-700 mb-3">Next Steps</p>
            <ul className="text-[12px] text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>Review the rejection reason above carefully</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>Address any issues or provide missing information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>Contact support if you need clarification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>You can reapply once you've resolved the issues</span>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <p className="text-[12px] text-gray-500 mb-8">
            For more information, please contact our support team at{" "}
            <span className="font-semibold">support@movoprive.com</span>
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/driver/onboarding/type")}
              className="w-full py-3 rounded-xl text-white font-bold text-[14px] text-center"
              style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
            >
              Start New Application
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
