"use client";

import Image from "next/image";
import Link from "next/link";

export default function OnboardingSuccessPage() {
  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-[480px] px-6 text-center">

          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-36 h-36">
              <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          {/* Success icon */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #2D0A53, #8B7500)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-[24px] font-bold text-gray-900 mb-2">
            Onboarding Submitted!
          </h1>

          {/* Message */}
          <p className="text-[14px] text-gray-600 mb-2 leading-relaxed">
            Thank you for submitting your fleet partner onboarding application.
          </p>

          <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
            Our team will review your information and documents. You'll receive an email notification once your application has been reviewed. This typically takes 1-3 business days.
          </p>

          {/* What happens next */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
            <p className="text-[12px] font-bold text-gray-700 mb-3">What Happens Next</p>
            <ul className="text-[12px] text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>Our admin team will review your company and vehicle information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>We'll verify your documents and registration details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>You'll receive an approval or rejection notification via email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 mt-1.5" />
                <span>Once approved, your account will be activated and ready to use</span>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <p className="text-[12px] text-gray-500 mb-8">
            If you have any questions, please contact our support team at{" "}
            <span className="font-semibold">support@movoprive.com</span>
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/driver/home"
              className="w-full py-3 rounded-xl text-white font-bold text-[14px] text-center"
              style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-[14px] text-center"
            >
              Back to Home
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
