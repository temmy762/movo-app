"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function PromotionsPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen bg-gray-100 flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* White card */}
      <div className="mx-4 mt-4 mb-6 flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100 relative">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-5 no-hover-fx"
            aria-label="Go back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Promotions</h1>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-12">
          <Image
            src="/images/dab334b2487807a423c69ff61b28a79baa65e43e.gif"
            alt="No promotions"
            width={200}
            height={180}
            className="object-contain mb-6"
            unoptimized
          />
          <p className="text-[16px] font-bold text-gray-900 mb-2">No promotion available</p>
          <p className="text-[13px] text-gray-400 leading-relaxed max-w-[260px]">
            There are no promotion available in your account at this time
          </p>
        </div>
      </div>
    </div>
  );
}
