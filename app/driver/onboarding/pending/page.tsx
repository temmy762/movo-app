"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface OnboardingData {
  id: string;
  type: string;
  submittedAt: string | null;
}

export default function PendingPage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/driver/onboarding/status")
      .then(r => r.json())
      .then(d => {
        if (d.adminStatus === "PENDING" || d.adminStatus === "UNDER_REVIEW") {
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

          {/* Pending icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-extrabold text-gray-900 mb-2">
            Application Under Review
          </h1>

          {/* Message */}
          <p className="text-[14px] text-gray-600 mb-2 leading-relaxed">
            Thank you for submitting your Movo Privé onboarding application.
          </p>

          <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Our team is reviewing your information and documents. This typically takes <strong>1-3 business days</strong>.
          </p>

          {/* What happens next */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
            <p className="text-[12px] font-bold text-blue-900 mb-3">What Happens Next</p>
            <ul className="text-[12px] text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span>Our admin team will review your documents and information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span>Background verification will be initiated</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span>You'll be notified once the review is complete</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span>If approved, your account will be activated immediately</span>
              </li>
            </ul>
          </div>

          {/* Submission details */}
          {data?.submittedAt && (
            <div className="text-[11px] text-gray-400 mb-6">
              Submitted on {new Date(data.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}

          {/* Contact info */}
          <p className="text-[12px] text-gray-500 mb-8">
            If you have any questions, please contact our support team at{" "}
            <span className="font-semibold">support@movoprive.com</span>
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
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
