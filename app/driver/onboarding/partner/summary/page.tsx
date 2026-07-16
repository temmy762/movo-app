"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFleetOnboarding } from "../context";

const TOTAL_STEPS = 9;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-[340px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: i < step ? "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" : "#d1d5db" }}
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
              style={{ background: i < step - 1 ? "linear-gradient(90deg, #131936, #C6BFB2)" : "#e5e7eb" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function getStatusItems(data: any) {
  return [
    { label: "Company Information", value: data.companyName ? "Completed" : "Incomplete", ok: !!data.companyName },
    { label: "Fleet Information", value: data.fleetSize ? "Completed" : "Incomplete", ok: !!data.fleetSize },
    { label: "First Vehicle & Chauffeur", value: data.firstVehicleYear ? "Completed" : "Incomplete", ok: !!data.firstVehicleYear },
    { label: "Program/Training", value: "Pending", ok: false },
    { label: "Documents", value: "Pending", ok: false },
    { label: "Contract", value: "Pending", ok: false },
    { label: "Payment Details", value: "Pending", ok: false },
  ];
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0 mt-1"
      style={{ background: ok ? "linear-gradient(135deg,#131936,#C6BFB2)" : "#d1d5db" }}
    />
  );
}

export default function ApplicationSummaryPage() {
  const router = useRouter();
  const { data } = useFleetOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/driver/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FLEET",
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to submit onboarding");
        return;
      }

      // Success - redirect to success page
      router.push("/driver/onboarding/success");
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-5">
            <div className="relative w-36 h-36">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO" fill className="object-contain" priority />
            </div>
          </div>

          <h1 className="text-[20px] font-bold text-gray-900 mt-1 text-center">Fleet Partner Onboarding</h1>
          <ProgressBar step={9} />

          {/* Section heading */}
          <p className="text-[15px] font-bold text-gray-900 mb-4">Application Summary</p>

          {/* Status checklist */}
          <ul className="mb-5 space-y-2">
            {getStatusItems(data).map((item) => (
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

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-600">{error}</p>
            </div>
          )}

          {/* FAQ */}
          <p className="text-[12px] text-gray-500 mb-6">
            For more information, you can visit our FAQ page{" "}
            <Link href="#" className="font-semibold underline" style={{ color: "#131936" }}>
              here
            </Link>
            .
          </p>

          {/* Navigation */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/payment")}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
