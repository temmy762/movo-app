"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FilterState = {
  vehicleClass: string[];
  date: string[];
  location: string[];
  rideType: string[];
};

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 py-2.5 cursor-pointer">
      <div
        onClick={onChange}
        className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer"
        style={{ borderColor: checked ? "#2D0A53" : "#d1d5db", background: checked ? "linear-gradient(135deg,#2D0A53,#8B7500)" : "white" }}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span className="text-[14px] text-gray-700">{checked ? <strong>{label}</strong> : label}</span>
    </label>
  );
}

function FilterPanel({
  filters,
  setFilters,
  onClose,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onClose: () => void;
}) {
  function toggle(key: keyof FilterState, val: string) {
    const arr = filters[key];
    setFilters({
      ...filters,
      [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
    });
  }

  return (
    <div className="h-full flex flex-col bg-white" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Filter header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button className="no-hover-fx" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
              <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
            </svg>
          </button>
          <span className="text-[16px] font-bold text-gray-900">Filter options</span>
        </div>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => setFilters({ vehicleClass: [], date: [], location: [], rideType: [] })}
        >
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Vehicle Class */}
        <div className="mb-4">
          <p className="text-[13px] font-bold text-gray-800 mb-1">Vehicle Class</p>
          <CheckRow label="Business" checked={filters.vehicleClass.includes("Business")} onChange={() => toggle("vehicleClass", "Business")} />
          <div className="h-px bg-gray-100 mt-1" />
        </div>

        {/* Date */}
        <div className="mb-4">
          <p className="text-[13px] font-bold text-gray-800 mb-1">Date</p>
          {["Today", "Tomorrow", "This week"].map((d) => (
            <CheckRow key={d} label={d} checked={filters.date.includes(d)} onChange={() => toggle("date", d)} />
          ))}
          <div className="h-px bg-gray-100 mt-1" />
        </div>

        {/* Location */}
        <div className="mb-4">
          <p className="text-[13px] font-bold text-gray-800 mb-1">Location</p>
          {["Airport pickup", "Airport dropoff"].map((l) => (
            <CheckRow key={l} label={l} checked={filters.location.includes(l)} onChange={() => toggle("location", l)} />
          ))}
          <div className="h-px bg-gray-100 mt-1" />
        </div>

        {/* Ride Type */}
        <div className="mb-4">
          <p className="text-[13px] font-bold text-gray-800 mb-1">Ride Type</p>
          {["Transfer", "Hourly"].map((r) => (
            <CheckRow key={r} label={r} checked={filters.rideType.includes(r)} onChange={() => toggle("rideType", r)} />
          ))}
        </div>
      </div>

      <div className="px-4 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl text-white font-bold text-[15px]"
          style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function OffersPage() {
  const router = useRouter();
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    vehicleClass: [],
    date: [],
    location: [],
    rideType: [],
  });

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-[18px] font-bold text-gray-900">Offers</h1>
        <button
          className="no-hover-fx text-[13px] font-semibold"
          style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          onClick={() => setShowFilter(true)}
        >
          Filter
        </button>
      </header>

      {/* Desktop: side-by-side layout when filter open */}
      <div className={`flex-1 flex ${showFilter ? "md:flex-row" : ""}`}>

        {/* Main offers area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-4">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="#e5e7eb" strokeWidth="1.2" />
          </svg>
          <p className="text-[15px] font-semibold text-gray-700 mb-1">No offers available right now</p>
          <p className="text-[12px] text-gray-400 text-center mb-3">
            All offers have been set. New offers will be added as see they come.
          </p>
          <button
            className="no-hover-fx text-[13px] font-semibold"
            style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
        </div>

        {/* Filter panel — mobile: full overlay, desktop: inline right panel */}
        {showFilter && (
          <>
            {/* Mobile overlay */}
            <div
              className="fixed inset-0 z-40 bg-white md:hidden"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)} />
            </div>

            {/* Desktop inline panel */}
            <div className="hidden md:flex md:w-80 md:border-l md:border-gray-100 md:shrink-0">
              <div className="w-full">
                <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)} />
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
