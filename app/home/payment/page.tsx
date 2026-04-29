"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function PaymentPage() {
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
          <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Payment</h1>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-12">
          <Image
            src="/images/57b31fbf43cf6ae8ecdfa0bebede3c0df6e2099d.gif"
            alt="No payment method"
            width={180}
            height={140}
            className="object-contain mb-7"
            unoptimized
          />
          <p className="text-[14px] text-gray-500 leading-relaxed max-w-[240px]">
            To book your first ride, please add a payment method to your account
          </p>
        </div>

        {/* CTA */}
        <div className="px-5 pb-7">
          <button
            type="button"
            onClick={() => router.push("/home/payment/add-card")}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px]"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Add payment method
          </button>
        </div>
      </div>
    </div>
  );
}
