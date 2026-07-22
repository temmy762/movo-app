"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

interface Props {
  title: string;
  bannerImg: string;
  /** booking mode carried into the funnel: "airport" | "hourly" (omit for city rides) */
  mode?: string;
  /** short blurb under the title */
  desc?: string;
}

/**
 * Per MOVO Team's clarified flow, this page no longer pre-picks a ride tier —
 * the tier toggles were removed. Booking goes straight to the address screen;
 * the tier list (with live per-trip pricing) is chosen once, after addresses.
 */
export default function ServiceDetailPage({ title, bannerImg, mode, desc }: Props) {
  const router = useRouter();
  const bookHref = `/home/pickup${mode ? `?mode=${mode}` : ""}`;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-[480px] md:max-w-2xl flex flex-col flex-1 pt-4 md:pt-0">
        {/* Banner */}
        <div className="relative mx-4 md:mx-0 rounded-2xl md:rounded-t-none md:rounded-b-3xl overflow-hidden h-48 md:h-72">
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
          {desc && <p className="text-[13px] text-gray-500 mt-1 leading-snug">{desc}</p>}
        </div>

        {/* Spacer */}
        <div className="h-4" />

        {/* Book now — straight to the address screen; tiers are chosen after */}
        <div className="px-4 pb-8">
          <button
            type="button"
            onClick={() => router.push(bookHref)}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide"
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
          >
            Book now
          </button>
        </div>
      </div>
    </div>
  );
}
