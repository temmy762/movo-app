"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const features = [
  { icon: "🚗", title: "Your car, our driver", desc: "Your personal chauffeur drives you home in your own vehicle." },
  { icon: "👥", title: "Two-chauffeur team", desc: "A recovery driver follows to bring your primary driver back." },
  { icon: "📍", title: "One seamless booking", desc: "Book once. We coordinate both chauffeurs behind the scenes." },
  { icon: "🔒", title: "Safe & premium", desc: "Fully vetted Movo Black-tier chauffeurs only." },
];

export default function CareRidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F5F2", fontFamily: "var(--font-body)" }}>

      {/* Hero */}
      <div className="relative overflow-hidden h-64">
        <Image src="/images/home banner.png" alt="Safe Ride" fill className="object-cover object-top" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(10,10,15,0.85) 100%)" }} />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="absolute bottom-5 left-4 right-4">
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Premium Service</span>
          <h1 className="text-[26px] font-bold text-white mt-1 leading-tight">Safe Ride</h1>
          <p className="text-white/80 text-[13px] mt-1">We drive you home — in your own car.</p>
        </div>
      </div>

      {/* How it works */}
      <div className="px-4 py-6">
        <p className="text-[16px] font-bold text-gray-900 mb-4">How it works</p>
        <div className="flex flex-col gap-3">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <p className="text-[14px] font-bold text-gray-900">{f.title}</p>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 pb-4">
        <p className="text-[16px] font-bold text-gray-900 mb-4">The journey</p>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {[
            "Select Safe Ride",
            "Enter pickup & destination",
            "Confirm your booking",
            "Primary chauffeur arrives & drives your car",
            "Recovery chauffeur follows to destination",
            "You arrive home — both chauffeurs depart together",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg,#131936,#2A3055)" }}
              >
                {i + 1}
              </div>
              <p className="text-[13px] text-gray-700 leading-snug">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 mt-2">
        <button
          onClick={() => router.push("/home/pickup?service=care&tier=black")}
          className="w-full py-4 rounded-2xl text-white font-bold text-[16px] tracking-wide shadow-lg"
          style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
        >
          Book Care Ride
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2">Movo Black tier · Two chauffeurs included</p>
      </div>

    </div>
  );
}
