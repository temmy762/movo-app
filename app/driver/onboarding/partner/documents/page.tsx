"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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

export default function DocumentUploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const names = Array.from(files).map((f) => f.name);
    setUploaded((prev) => [...prev, ...names]);
  }

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
          <ProgressBar step={5} />

          {/* Instruction */}
          <p className="text-[13px] font-semibold text-red-500 mb-6">
            CLICK Upload Document Button to upload Your Document
          </p>

          {/* Upload area */}
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-12 mb-4 cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            {/* Document upload icon */}
            <svg width="72" height="72" viewBox="0 0 96 96" fill="none">
              <rect x="14" y="8" width="52" height="68" rx="6" fill="none" stroke="#d1d5db" strokeWidth="3" />
              <path d="M14 20h52" stroke="#d1d5db" strokeWidth="2" />
              <circle cx="72" cy="72" r="20" fill="white" stroke="#e5e7eb" strokeWidth="2" />
              <polyline points="65,72 72,65 79,72" fill="none" stroke="#2D0A53" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="72" y1="65" x2="72" y2="80" stroke="#2D0A53" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="text-[13px] text-gray-400 mt-3">Tap to upload documents</p>
            <p className="text-[11px] text-gray-300 mt-1">PDF, JPG, PNG accepted</p>
          </div>

          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFiles(e.target.files)} suppressHydrationWarning />

          {/* Uploaded files list */}
          {uploaded.length > 0 && (
            <ul className="mb-4 space-y-1">
              {uploaded.map((name, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-gray-600">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }} />
                  {name}
                </li>
              ))}
            </ul>
          )}

          {/* Required doc note */}
          <p className="text-[12px] text-gray-400 mb-6">* 4 required documents must be uploaded before proceeding.</p>

          {/* Next */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/partner/training")}
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
