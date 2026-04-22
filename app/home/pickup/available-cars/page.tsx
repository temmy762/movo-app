"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const cars = [
  {
    id: 1,
    tier: "classic",
    name: "Movo Classic",
    specs: "Automatic  |  3 seats  |  Octane",
    distance: "800m (3mins away)",
    img: "/images/movo classic.png",
  },
  {
    id: 2,
    tier: "premium",
    name: "Movo Premium",
    specs: "Automatic  |  3 seats  |  Octane",
    distance: "800m (3mins away)",
    img: "/images/movo premium.png",
  },
  {
    id: 3,
    tier: "black",
    name: "Movo Privé Black",
    specs: "Automatic  |  3 seats  |  Octane",
    distance: "800m (3mins away)",
    img: "/images/prive black.png",
  },
];

function AvailableCarsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") ?? "all";

  const filtered =
    tier === "all"
      ? [...cars, ...cars, ...cars].slice(0, 9)
      : Array(3).fill(cars.find((c) => c.tier === tier) ?? cars[0]);

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[15px] text-gray-500 mb-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Available cars for ride</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{filtered.length} cars found</p>
        </div>
      </div>

      {/* Car list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="max-w-lg mx-auto space-y-3">
          {filtered.map((car, i) => (
            <div
              key={i}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 pt-3 pb-3 flex flex-col gap-2"
            >
              {/* Top row: info + image */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-gray-900">{car.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{car.specs}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <p className="text-[12px] text-gray-500">{car.distance}</p>
                  </div>
                </div>
                <div className="relative w-24 h-16 shrink-0">
                  <Image src={car.img} alt={car.name} fill className="object-contain" />
                </div>
              </div>

              {/* BOOK NOW button */}
              <button
                type="button"
                onClick={() => router.push("/home/ride")}
                className="w-full py-2.5 rounded-lg text-white font-bold text-[13px] tracking-widest"
                style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
              >
                BOOK NOW
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AvailableCarsPage() {
  return (
    <Suspense>
      <AvailableCarsContent />
    </Suspense>
  );
}
