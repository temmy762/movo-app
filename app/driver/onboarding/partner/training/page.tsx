"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 7;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-[320px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: i < step ? "linear-gradient(135deg, #2D0A53 0%, #8B7500 100%)" : "#d1d5db" }}
          >
            {i < step && (
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
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

const modules = [
  "Welcome to Movo Privé",
  "Chauffeur App: The basic",
  "Chauffeur App: Managing Rides",
  "Waiting Time Policy",
  "Partner Portal",
  "Reviewing Rides",
  "Guidelines, Quality Standard and Incentives",
  "How to Avoid Incidents",
  "Safety Guidelines & Emergency Procedures",
];

export default function TrainingModulesPage() {
  const router = useRouter();
  const completed = 0;

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
          <ProgressBar step={6} />

          {/* Intro */}
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
            Welcome to the{" "}
            <span className="font-semibold" style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Movo Privé
            </span>{" "}
            Partner Training. To begin offering rides with{" "}
            <span className="font-semibold" style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Movo Privé
            </span>
            , please complete the following nine modules. Each module can be accessed individually using the link below.
          </p>

          <p className="text-[13px] text-gray-500 mb-4">
            You have completed <strong>{completed}</strong> out of 9 modules.
          </p>

          {/* Module index */}
          <p className="text-[12px] text-gray-500 mb-1">Module#</p>
          <ol className="list-decimal list-inside mb-5 space-y-0.5">
            {modules.map((_, i) => (
              <li key={i} className="text-[12px] text-gray-500">{i + 1}.</li>
            ))}
          </ol>

          {/* Partner Modules links */}
          <p className="text-[13px] font-bold text-gray-800 mb-2">Partner Modules</p>
          <ul className="mb-5 space-y-1.5">
            {modules.map((mod) => (
              <li key={mod}>
                <Link
                  href="#"
                  className="text-[13px] font-medium underline-offset-2 hover:underline"
                  style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {mod}
                </Link>
              </li>
            ))}
          </ul>

          {/* Progress percentage */}
          <p className="text-[13px] font-bold text-gray-800 mb-2">Progress Percentage</p>
          <ul className="mb-6 space-y-0.5">
            {modules.map((mod) => (
              <li key={mod} className="text-[12px] text-gray-500">0%</li>
            ))}
          </ul>

          {/* Divider */}
          <div className="h-px bg-gray-100 mb-5" />

          {/* Navigation */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/documents")}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-600"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/contract")}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
              style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
