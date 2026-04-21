"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const tiers = [
  { id: "classic", name: "Movo Classic", desc: "Effortless rides for every day." },
  { id: "premium", name: "Movo Premium", desc: "Elevated comfort. Premium performance." },
  { id: "black", name: "Movo Privé Black", desc: "Unparalleled luxury. Your personal concierge on wheels." },
];

interface Service {
  id: number;
  title: string;
  bannerImg: string;
  pageLabel: string;
  isPartyBus?: boolean;
}

interface Props {
  service: Service | null;
  onClose: () => void;
}

export default function ServiceBottomSheet({ service, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState("classic");

  useEffect(() => {
    if (service) {
      setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
    }
  }, [service]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Sheet — bottom sheet on mobile, centered modal on desktop */}
      <div
        className={`relative bg-white w-full md:w-full md:max-w-lg md:rounded-3xl rounded-t-3xl overflow-y-auto max-h-[92vh] md:max-h-[85vh] transition-all duration-300 ${visible ? "translate-y-0 md:scale-100 md:opacity-100" : "translate-y-full md:translate-y-0 md:scale-95 md:opacity-0"}`}
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="w-full max-w-[480px] mx-auto">
          {/* Page label */}
          <div className="px-4 pt-1 pb-1 md:pt-4">
            <p className={`text-[12px] ${service.isPartyBus ? "font-semibold" : "text-gray-400"}`}
              style={service.isPartyBus ? { color: "#2D0A53" } : {}}>
              {service.pageLabel}
            </p>
          </div>

          {/* Banner */}
          <div className="relative mx-4 rounded-2xl overflow-hidden h-48">
            <Image src={service.bannerImg} alt={service.title} fill className="object-cover" priority />
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <div className="px-4 mt-4">
            <h1 className="text-[20px] font-bold text-gray-900">{service.title}</h1>
          </div>

          {/* Tiers */}
          {service.isPartyBus ? (
            <div className="px-4 mt-3">
              <div className="flex items-start gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setSelected(selected === "black" ? "" : "black")}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${selected === "black" ? "bg-blue-600" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${selected === "black" ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">Movo Privé Black Charter</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Unparalleled luxury. Your personal concierge on wheels. Your private club on the move — where the journey is the party.
                  </p>
                </div>
              </div>
              <div className="h-px bg-gray-100 mt-2" />

              {/* Party Bus promo cards */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="relative rounded-xl overflow-hidden h-32">
                  <Image src="/images/partybus2 card img.png" alt="Party on wheels" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-1">
                    <p className="text-white text-[10px] font-bold leading-tight">exciting as the</p>
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden h-32">
                  <Image src="/images/partybus2 card img.png" alt="Party on wheels 2" fill className="object-cover object-right" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-1">
                    <p className="text-white text-[10px] font-bold leading-tight">Party On Wheels</p>
                    <p className="text-gray-300 text-[9px] mt-0.5 leading-tight">Where the journey is just as exciting as the destination.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 mt-3 space-y-0">
              {tiers.map((tier, i) => (
                <div key={tier.id}>
                  <div className="flex items-start gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSelected(tier.id)}
                      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${selected === tier.id ? "bg-blue-600" : "bg-gray-200"}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${selected === tier.id ? "translate-x-5" : "translate-x-1"}`} />
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
          )}

          {/* Book now */}
          <div className="px-4 mt-5 pb-8">
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
    </div>
  );
}
