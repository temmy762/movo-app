"use client";

import { useRouter } from "next/navigation";

export default function PromotionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100 relative">
          <button type="button" onClick={() => router.back()} className="absolute left-5 no-hover-fx" aria-label="Go back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Promotions</h1>
        </div>

        {/* Coming Soon */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-12">
          {/* Icon */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>

          {/* Badge */}
          <span
            className="inline-block text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ background: "linear-gradient(90deg, #131936, #C6BFB2)", color: "white" }}
          >
            Coming Soon
          </span>

          <p className="text-[20px] font-bold text-gray-900 leading-tight mb-3">
            Exclusive Offers<br />Launching Soon
          </p>
          <p className="text-[13px] text-gray-400 leading-relaxed max-w-[280px]">
            We&apos;re working on exclusive promotions, discounts, and loyalty rewards. 
            Check back soon — your next ride might be on us.
          </p>

          {/* Decorative cards */}
          <div className="flex gap-3 mt-8 w-full max-w-[320px]">
            {[
              { label: "Discounts", icon: "%" },
              { label: "Loyalty", icon: "★" },
              { label: "Referrals", icon: "↗" },
            ].map(item => (
              <div
                key={item.label}
                className="flex-1 rounded-2xl py-4 flex flex-col items-center gap-1.5 border border-gray-100"
                style={{ background: "#f9f9f7" }}
              >
                <span className="text-[18px] font-bold text-gray-300">{item.icon}</span>
                <span className="text-[10px] font-semibold text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
