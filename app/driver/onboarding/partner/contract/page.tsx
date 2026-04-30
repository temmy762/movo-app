"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 9;

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

export default function PartnerContractPage() {
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
          <ProgressBar step={7} />

          {/* Section heading */}
          <p className="text-[15px] font-bold text-gray-900 mb-1">Partner Contract</p>
          <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
            Please review our contract below and accept your contractual agreement.
          </p>

          {/* Contract preview box */}
          <div className="border border-gray-200 rounded-xl px-4 py-4 mb-2">
            <p className="text-[11px] text-gray-400 mb-3">Contract Preview</p>
            <div className="text-center text-[12px] text-gray-700 leading-relaxed space-y-2">
              <p className="font-semibold text-[13px]">Framework cooperation and Transportation Services Agreement</p>
              <p className="text-gray-500 text-[11px]">(Hereinafter the &quot;Partner Agreement&quot;)</p>
              <p className="text-gray-500">by and between</p>
              <p className="font-medium">Partner Company:</p>
              <div className="text-left mt-2 space-y-1 text-[12px] text-gray-600">
                <p>AU</p>
                <p>Austin Pop, 970 000, USA</p>
                <p>Duly registered / incorporated under the laws of USA</p>
                <p>VAT ID: AT123459876</p>
                <p>Represented by Abdulhammid duly authorized</p>
              </div>
              <p className="text-gray-500 text-[12px] mt-2">Hereinafter referred to as &quot;Partner&quot; and</p>
              <p
                className="font-semibold text-[13px]"
                style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                Movo Privé, Fasanenstrasse 59, 10827 Berlin, Germany
              </p>
            </div>
          </div>

          {/* Download link */}
          <Link
            href="#"
            className="block text-[12px] underline text-center mb-5"
            style={{ color: "#2D0A53" }}
          >
            click here to download a copy of your contractual agreement
          </Link>

          {/* Sign instruction */}
          <div className="border border-gray-200 rounded-lg px-4 py-3 mb-4 text-center">
            <p className="text-[12px] text-gray-400">
              Click the <span className="font-semibold">&quot;Sign your Contract&quot;</span> button to begin
            </p>
          </div>

          {/* Sign button */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/partner/payment")}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide mb-8"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Sign your contract
          </button>

        </div>
      </div>
    </div>
  );
}
