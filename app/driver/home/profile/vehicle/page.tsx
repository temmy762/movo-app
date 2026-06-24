"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Vehicle = {
  make: string;
  model: string;
  year: number;
  plate: string;
  tier: string;
  photoUrl: string | null;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-[13px] text-gray-500">{label}</span>
      <span className="text-[13px] font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export default function VehiclePage() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/driver/vehicle")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setVehicle(d.vehicle); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">Default Vehicle</h1>
      </header>

      <div className="px-4 pt-5 pb-8 w-full max-w-lg mx-auto">
        {loading ? (
          <div className="bg-white rounded-2xl px-4 shadow-sm animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="h-3.5 bg-gray-200 rounded w-24" />
                <div className="h-3.5 bg-gray-200 rounded w-28" />
              </div>
            ))}
          </div>
        ) : vehicle ? (
          <>
            {/* Vehicle photo */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
              {vehicle.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vehicle.photoUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="w-full h-44 bg-gray-100 flex flex-col items-center justify-center gap-2">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                    <rect x="2" y="8" width="20" height="12" rx="2" />
                    <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
                    <circle cx="7" cy="17" r="1.5" /><circle cx="17" cy="17" r="1.5" />
                  </svg>
                  <p className="text-[11px] text-gray-400">No photo uploaded</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl px-4 shadow-sm mb-4">
              <InfoRow label="Make" value={vehicle.make} />
              <InfoRow label="Model" value={vehicle.model} />
              <InfoRow label="Year" value={String(vehicle.year)} />
              <InfoRow label="Plate" value={vehicle.plate} />
              <InfoRow label="Tier" value={vehicle.tier} />
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              To update your vehicle details, please contact support.
            </p>
          </>
        ) : (
          <div className="bg-white rounded-2xl px-4 py-10 shadow-sm flex flex-col items-center text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
              <rect x="2" y="8" width="20" height="12" rx="2" />
              <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
              <circle cx="7" cy="17" r="1.5" />
              <circle cx="17" cy="17" r="1.5" />
            </svg>
            <p className="text-[13px] font-semibold text-gray-700">No vehicle registered</p>
            <p className="text-[11px] text-gray-400 mt-1">Complete onboarding to add your vehicle.</p>
            <button onClick={() => router.push("/driver/onboarding/partner/vehicle")}
              className="mt-4 px-5 py-2 rounded-xl text-white text-[13px] font-semibold"
              style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
              Add Vehicle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
