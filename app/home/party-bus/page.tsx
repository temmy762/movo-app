"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PartyBusPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(true);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="w-full max-w-[480px] md:max-w-2xl flex flex-col flex-1 pt-4 md:pt-0">
        {/* Banner */}
        <div className="relative mx-4 md:mx-0 rounded-2xl md:rounded-t-none md:rounded-b-3xl overflow-hidden h-44 md:h-72">
          <Image src="/images/party-bus.png" alt="Party Bus" fill className="object-cover" priority />
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
          <h1 className="text-[20px] font-bold text-gray-900">Party Bus</h1>
        </div>

        {/* Tier */}
        <div className="px-4 mt-3">
          <div className="flex items-start gap-3 py-2">
            <button
              type="button"
              onClick={() => setSelected(!selected)}
              className={`relative inline-flex h-6 w-11 shrink-0 mt-0.5 items-center rounded-full transition-colors ${selected ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${selected ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <div>
              <p className="text-[15px] font-bold text-gray-900">Movo Privé Black Charter</p>
              <p className="text-[13px] text-gray-500 mt-0.5 leading-snug">
                Unparalleled luxury. Your personal concierge on wheels. Your private club on the move — where the journey is the party.
              </p>
            </div>
          </div>
          <div className="h-px bg-gray-100 mt-2" />
        </div>

        {/* Two promo cards */}
        <div className="px-4 mt-3 grid grid-cols-2 gap-3">
          {/* Card 1 */}
          <div className="relative rounded-xl overflow-hidden h-24">
            <Image src="/images/partybus2 card img.png" alt="Party on wheels" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-1">
              <p className="text-white text-[12px] font-bold leading-tight">exciting as the</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="relative rounded-xl overflow-hidden h-24">
            <Image src="/images/partybus2 card img.png" alt="Party on wheels 2" fill className="object-cover object-right" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-1">
              <p className="text-white text-[12px] font-bold leading-tight">Party On Wheels</p>
              <p className="text-gray-300 text-[11px] mt-0.5 leading-tight">Where the journey is just as exciting as the destination.</p>
            </div>
          </div>
        </div>

        {/* Book now */}
        <div className="px-4 mt-4 pb-6">
          <button
            type="button"
            onClick={() => router.push("/home/pickup/available-cars?tier=black")}
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
