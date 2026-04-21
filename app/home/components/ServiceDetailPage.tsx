"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const tiers = [
  {
    id: "classic",
    name: "Movo Classic",
    desc: "Effortless rides for every day.",
  },
  {
    id: "premium",
    name: "Movo Premium",
    desc: "Elevated comfort. Premium performance.",
  },
  {
    id: "black",
    name: "Movo Privé Black",
    desc: "Unparalleled luxury. Your personal concierge on wheels.",
  },
];

interface Props {
  title: string;
  bannerImg: string;
}

export default function ServiceDetailPage({ title, bannerImg }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState("classic");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="w-full max-w-[480px] flex flex-col flex-1 md:pt-10">
        {/* Banner */}
        <div className="relative mx-4 rounded-2xl overflow-hidden h-48">
          <Image src={bannerImg} alt={title} fill className="object-cover" priority />
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <div className="px-4 mt-4">
          <h1 className="text-[20px] font-bold text-gray-900">{title}</h1>
        </div>

        {/* Tiers */}
        <div className="px-4 mt-3 space-y-0">
          {tiers.map((tier, i) => (
            <div key={tier.id}>
              <div className="flex items-start gap-3 py-3">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => setSelected(tier.id)}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 overflow-hidden ${
                    selected === tier.id ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      selected === tier.id ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{tier.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{tier.desc}</p>
                </div>
              </div>
              {i < tiers.length - 1 && <div className="h-px bg-gray-100" />}
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="h-4" />

        {/* Book now */}
        <div className="px-4 pb-8">
          <button
            type="button"
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide"
            style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
          >
            Book now
          </button>
        </div>
      </div>
    </div>
  );
}
