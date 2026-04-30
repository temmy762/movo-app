"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 9;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-[340px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: i < step ? "linear-gradient(135deg, #2D0A53 0%, #8B7500 100%)" : "#d1d5db" }}
          >
            {i < step && (
              <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div
              className="h-[2px] flex-1"
              style={{ background: i < step - 1 ? "linear-gradient(90deg, #2D0A53, #8B7500)" : "#e5e7eb" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const statusItems = [
  { label: "Status of Application", value: "In progress", ok: false },
  { label: "Training", value: "Incomplete", ok: false },
  { label: "First chauffeurs Identity", value: "Not Verified", ok: false },
  { label: "Documents", value: "documents uploaded", ok: true },
  { label: "Contract sign", value: "Yes", ok: true },
  { label: "Payment details submitted", value: "Submitted", ok: true },
];

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0 mt-1"
      style={{ background: ok ? "linear-gradient(135deg,#2D0A53,#8B7500)" : "#d1d5db" }}
    />
  );
}

export default function ApplicationSummaryPage() {
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
          <ProgressBar step={9} />

          {/* Section heading */}
          <p className="text-[15px] font-bold text-gray-900 mb-4">Application Summary</p>

          {/* Status checklist */}
          <ul className="mb-5 space-y-2">
            {statusItems.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-[13px] text-gray-700">
                <StatusDot ok={item.ok} />
                <span>
                  {item.label}:{" "}
                  <span className={item.ok ? "font-semibold" : "font-semibold text-gray-400"}>
                    {item.value}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* Warning */}
          <p className="text-[12px] text-gray-500 leading-relaxed mb-4">
            Your application can only be submitted for review only if the above stated information is complete.
          </p>

          {/* Instructions */}
          <p className="text-[12px] text-gray-500 leading-relaxed mb-4">
            Please make sure you have completed all the steps listed above before you can submit your application for review. Please complete the chauffeur identity process you should have received on your email.
          </p>

          {/* FAQ */}
          <p className="text-[12px] text-gray-500 mb-6">
            For more information, you can visit our FAQ page{" "}
            <Link href="#" className="font-semibold underline" style={{ color: "#2D0A53" }}>
              here
            </Link>
            .
          </p>

          {/* Navigation */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/payment")}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-600"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => router.push("/driver/home")}
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
