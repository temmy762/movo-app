"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 9;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-[260px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: i < step ? "linear-gradient(135deg, #2D0A53 0%, #8B7500 100%)" : "#d1d5db" }}
          >
            {i < step && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className="h-[2px] flex-1" style={{ background: i < step - 1 ? "linear-gradient(90deg, #2D0A53, #8B7500)" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

const benefits = [
  "Quality Bonus opportunities and the chance to join our partner Prestige Club",
  "Regular, reliable payment for ride",
  "Access to an established global customer base of business-class Travelers",
  "Easy account management with our user-friendly chauffeur app and Online partner portal",
  "Choice of which rides you want to take to fill any gaps in your daily schedule",
];

const nextSteps = [
  "Upload *4 required documents",
  "Complete 6 partner training modules",
  "Sign the partner agreement contract",
  "Submit your payment details",
  "Complete a live webinar",
];

export default function OnboardingProgramPage() {
  const router = useRouter();

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-5">
            <div className="relative w-36 h-36">
              <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          <h1 className="text-[20px] font-bold text-gray-900 mt-1 text-center">Partner Onboarding</h1>
          <ProgressBar step={4} />

          {/* Section title */}
          <p className="text-[15px] font-bold text-gray-900 mb-2">Onboarding Program</p>

          {/* Partner benefits */}
          <p className="text-[13px] text-gray-600 mb-3 leading-relaxed">
            Thank you for providing your company details, we are excited to have you drive with us soon. As a{" "}
            <span
              className="font-semibold"
              style={{ background: "linear-gradient(90deg, #2D0A53, #8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Movo Privé
            </span>{" "}
            partner, you&apos;ll get:
          </p>

          <ul className="mb-5 space-y-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12px] text-gray-600">
                <span
                  className="w-2 h-2 rounded-full shrink-0 mt-1"
                  style={{ background: "linear-gradient(135deg, #2D0A53, #8B7500)" }}
                />
                {b}
              </li>
            ))}
          </ul>

          {/* Next steps */}
          <p className="text-[13px] text-gray-600 mb-3 leading-relaxed">
            Before you can perform your first ride and join{" "}
            <span
              className="font-semibold"
              style={{ background: "linear-gradient(90deg, #2D0A53, #8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Movo Privé
            </span>{" "}
            global network of partners we need your help with following:
          </p>

          <ul className="mb-5 space-y-2">
            {nextSteps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-[12px] text-gray-600">
                <span
                  className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0"
                  style={{ background: "linear-gradient(135deg, #2D0A53, #8B7500)" }}
                >
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>

          <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
            Our team is looking forward to reviewing your information and supporting you through the registration process.
          </p>

          {/* Upload link */}
          <Link
            href="/driver/onboarding/partner/documents"
            className="block text-center text-[13px] font-bold underline mb-5"
            style={{ color: "#2D0A53" }}
          >
            CLICK HERE to Upload Document
          </Link>

          {/* Next button */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/partner/documents")}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide mb-8"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Next
          </button>

        </div>
      </div>
    </div>
  );
}
